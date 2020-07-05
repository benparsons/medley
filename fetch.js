const axios = require('axios');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('images.db');
var config = require("./config/config.json");

main();
async function main() {
    const options = {
        url: `https://api.creativecommons.engineering/v1/images?q=spark&page_size=500`,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json;charset=UTF-8',
            'Authorization': 'Bearer ' + config.bearer
        }
    };
    var response = await axios(options);

    console.log(Object.keys(response.data));
    console.log(response.data.result_count);
    console.log(response.data.results.length);
    //return;
    db.serialize(function () {
        for (row of response.data.results) {
            let sql = `INSERT INTO cc (title,  creator,  thumbnail,  license,  detail_url,  width,  height,  id,  creator_url,  url,  source,  license_version,  foreign_landing_url,  related_url) VALUES (
            '${row.title ? row.title.replace(/\'/g, "''") : "(title missing)"}',
            '${row.creator ? row.creator.replace(/\'/g, "''") : "(creator missing)"}',
            '${row.thumbnail}',
            '${row.license}', '${row.detail_url}', ${row.width || 0}, ${row.height || 0},
            '${row.id}', '${row.creator_url}', '${row.url}', '${row.source}',
            '${row.license_version}',
            '${row.foreign_landing_url}', '${row.related_url}'
            )`;

                db.run(sql, err => {
                    if (err) {
                     console.log(err);
                     console.log(sql);
                    }
                });
            
            if (typeof(row.tags) != "object") {
                continue;
            }
            for (tag of row.tags) {
                let tagSql = `INSERT INTO cc_tags (cc_id, tag, source) VALUES (
                    '${row.id}', '${tag.name}', 'origin')`;
                db.run(tagSql, err => {
                    if (err) {
                        // console.log(err);
                        // console.log(tagSql);
                    }
                });
            }
        }


    });

    db.close();
    console.log(response.data.results_count);
}

// curl -H "Authorization: Bearer (token)" https://api.creativecommons.engineering/v1/images?q=corbeling