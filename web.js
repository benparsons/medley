const express = require('express');
const app = express();
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
app.set('view engine', 'pug');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('images.db');

app.get('/deal', function(req, res) {
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

app.get('/deal/interesting/:id/:value', function(req, res) {
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

app.get('/api/1/get/:interesting', function(req, res) {
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
            res.send({result: "ok"})
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
        res.send(JSON.stringify({ok: true}));
    });
        
});

app.get('/api/1/project_save/:save_id/:output', function(req, res) {
    let sort_order = 'ASC';
    if (req.params.output === 'output') {
        sort_order = 'DESC';
    }
    let sql = `select * from
    project_saves
    INNER JOIN cc ON project_saves.cc_id = cc.id
	LEFT JOIN cc_local_cache ON project_saves.cc_id = cc_local_cache.cc_id
    WHERE save_id = ${req.params.save_id}
    ORDER BY cc_local_cache.width ${sort_order}`;
    console.log(sql);
    db.get(sql, (err, row) => {
        if (err) {
            // console.log(err);
            // console.log(sql);
        }
            res.send(row);
    });
})

app.get('/images/:filename', function(req, res) {
    res.sendFile('images/' + req.params.filename,  { root: __dirname });
});

app.listen(8090, function () {  
    console.log('Medley listing on :8090');  
});