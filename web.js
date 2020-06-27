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
    let sql = `INSERT INTO project_saves (project_name, c_id, save_data)
    VALUES ('${req.params.project}', '${req.params.cc_id}', '${req.params.save_data})`;
    db.run(sql, err => {
        if (err) {
            console.log(err);
            console.log(sql);
        } else {
            res.send({result: "ok"})
        }
    });
});

app.listen(8090, function () {  
    console.log('Medley listing on :8090');  
});