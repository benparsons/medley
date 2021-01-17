const express = require('express');
const app = express();
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.set('view engine', 'pug');
var sqlite3 = require('sqlite3').verbose();
var sqlite = require('sqlite');
var db = new sqlite3.Database('images.db');
let config = require('./config.json');
var Flickr = require('flickr-sdk');
var flickr = new Flickr(config.flickr.key);
const https = require('https')
const fs = require('fs');
let db2 = {};

(async () => {
    // open the database
    db2 = await sqlite.open({
      filename: 'images.db',
      driver: sqlite3.Database
    })
})()

app.get('/deal', function (req, res) {
    let sql = "select * from cc LEFT JOIN cc_notes ON cc.id = cc_notes.cc_id WHERE cc_notes.interesting IS NULL ORDER BY RANDOM() LIMIT 1";
    db.get(sql, (err, row) => {
        if (err) {
            // console.log(err);
            // console.log(sql);
        }
        res.render('deal', {
            title: 'Hey',
            message: JSON.stringify(row, null, 2),
            url: row.url,
            id: row.id
        });
    });
});

app.get('/deal/interesting/:id/:value', function (req, res) {
    let sql = `INSERT INTO cc_notes (cc_id, interesting)
    VALUES ('${req.params.id}', '${req.params.value}')`;
    db.run(sql, err => {
        if (err) {
            console.log(err);
            console.log(sql);
        } else {
            res.redirect("/deal");
        }
    });

    // let sql = `select * from cc where id = '${req.params.id}'`;
    // db.get(sql, (err, row) => {
    //     res.render('deal/interesting', { 
    //         title: 'Hey', 
    //         message: JSON.stringify(row, null, 2),
    //         url: row.url,
    //         id: row.id
    //     });
    // });
});

app.get('/release/:project', async function (req, res) { // project=2020-06-20
    let nextProjectSaveResult = await nextProjectSave(req.params.project);
    let nextProjectSaveResultDetails = 
    res.render("release/preview", {
        text: JSON.stringify(nextProject, null, 2)
    });
});

app.get('/api/1/get/:interesting', function (req, res) {
    let sql = `select * from cc LEFT JOIN cc_notes ON cc.id = cc_notes.cc_id WHERE cc_notes.interesting = '${req.params.interesting}' ORDER BY RANDOM() LIMIT 1`;
    db.get(sql, (err, row) => {
        if (err) {
            // console.log(err);
            // console.log(sql);
        }
        res.send(row);
    });
});

app.get('/api/1/save/:project/:cc_id/:save_data', function (req, res) {
    let sql = `INSERT INTO project_saves (project_name, cc_id, save_data)
    VALUES ('${req.params.project}', '${req.params.cc_id}', '${req.params.save_data}')`;
    db.run(sql, err => {
        if (err) {
            console.log(err);
            console.log(sql);
        } else {
            res.send({ result: "ok" })
        }
    });
});

app.get('/api/1/compare/:project_name', function (req, res) {
    let sql = `select * from
    project_saves
    INNER JOIN cc ON project_saves.cc_id = cc.id
    WHERE project_name = '${req.params.project_name}'
    order by (wins + losses), (losses - wins) asc
    limit 2`;
    console.log(req.params.project_name)
    db.all(sql, (err, rows) => {
        if (err) {
            // console.log(err);
            // console.log(sql);
        }
        res.send(rows);
    });
})

app.get('/api/1/vote/:win/:lose', function (req, res) {
    let winSql = `update project_saves set wins = wins + 1 WHERE save_id = ${req.params.win}`;
    let loseSql = `update project_saves set losses = losses + 1 WHERE save_id = ${req.params.lose}`;
    db.exec(winSql).exec(loseSql, () => {
        res.send(JSON.stringify({ ok: true }));
    });

});

app.get('/api/1/project_save/:save_id/:output', async function (req, res) {
    let details = await projectSaveDetails(req.params.save_id, req.params.output);
    res.send(details);
});

async function projectSaveDetails(saveId, outputMode) {
    let sort_order = 'ASC';
    if (outputMode === 'output') {
        sort_order = 'DESC';
    }
    let sql = `select cc.width as cc_width, cc.height as cc_height, cc_local_cache.width as cc_local_cache_width, cc_local_cache.height as cc_local_cache_height, * from
    project_saves
    INNER JOIN cc ON project_saves.cc_id = cc.id
	LEFT JOIN cc_local_cache ON project_saves.cc_id = cc_local_cache.cc_id
    WHERE save_id = ${saveId}
    ORDER BY cc_local_cache.width ${sort_order}`;
    console.log("projectSaveDetails, saveId:" + saveId);
    let row = await db2.get(sql);
    console.log(row);
    return row;
}

// of the top two current scores
// sort by the top score
// then by the least recently used same cc_id
app.get('/api/1/flickr/pull/:photo_id/:cc_id', function (req, res) {
    let openStreams = 0;
    flickr.photos.getSizes({ photo_id: req.params.photo_id }).then(function (data) {

        data.body.sizes.size.forEach(s => {
            if (s.label === "Large" || s.label === "Original") {
                console.log(s);
                let ss = s.source.split('/');
                let filename = `${ss[ss.length - 1]}`;
                const file = fs.createWriteStream(`./images/${filename}`);
                https.get(s.source, function (response) {
                    openStreams++;
                    var stream = response.pipe(file);
                    stream.on("close", () => {
                        openStreams--;
                        console.log("openStreams: ", openStreams);
                        if (openStreams === 0) {
                            res.send("success");
                        }
                    });
                    let sql = `INSERT INTO 
                        cc_local_cache (
                            cc_id, source_url, filename, width, height
                        ) VALUES (
                            '${req.params.cc_id}', '${s.source}',
                            '${filename}', ${s.width}, ${s.height}
                        )
                    `;
                    console.log(sql);
                    db.run(sql, err => {
                        if (err) {
                            console.log(err);
                            console.log(sql);
                            res.send(`failed (db)\n${err}\n${sql}`);
                        }
                    });
                });
            }
        })

    }).catch(function (err) {
        res.send('failed\n' + err);
    });
});

app.get('/api/1/next_project_save/:project', async function (req, res) {
    let nextProjectSaveResult = await nextProjectSave(req.params.project);
    res.send(nextProjectSaveResult);
});

async function nextProjectSave(project) {
    let sql = `select *
    from project_saves p1
    left join (select cc_id, max(published) as p from project_saves
    group by cc_id
    order by p
    )  p2 on p1.cc_id = p2.cc_id

    where wins IN (
        select distinct wins
        from project_saves
        where published IS null
        order by wins DESC
        limit 2
    )
    and published is null
    and project_name = '${project}'

    order by wins DESC, p ASC
    limit 1`;
    let row = await db2.get(sql);
    return row;
}

app.get('/images/:filename', function(req, res) {
    res.sendFile('images/' + req.params.filename,  { root: __dirname });
});

app.listen(8090, function () {
    console.log('Medley listing on :8090');
});