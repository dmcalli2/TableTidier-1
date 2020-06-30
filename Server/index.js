"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _files = require("./files.js");

var _security = _interopRequireDefault(require("./security.js"));

var _table = require("./table.js");

var _metamap = require("./metamap.js");

var _extra_functions = _interopRequireDefault(require("./extra_functions.js"));

var _network_functions = require("./network_functions.js");

var express = require('express');

var bodyParser = require('body-parser');

var html = require("html");

var request = require("request");

var fs = require('fs');

var _require = require('pg'),
    Pool = _require.Pool,
    Client = _require.Client,
    Query = _require.Query;

var csv = require('csv-parser');

var CsvReadableStream = require('csv-reader');

var path = require('path'); //NODE R CONFIGURATION.


var R = require("r-script");

var cors = require('cors'); // I want to access cheerio from everywhere.


global.cheerio = require('cheerio');
global.CONFIG = require('./config.json');
global.available_documents = {};
global.abs_index = [];
global.tables_folder = "HTML_TABLES";
global.tables_folder_deleted = "HTML_TABLES_DELETED";
global.cssFolder = "HTML_STYLES";
global.DOCS = [];
global.msh_categories = {
  catIndex: {},
  allcats: [],
  pmids_w_cat: []
};
global.PRED_METHOD = "grouped_predictor";
global.umls_data_buffer = {}; // TTidier subsystems load.

console.log("Loading Files Management");
console.log("Loading Security");
console.log("Loading Table Libs");
console.log("Loading MetaMap Docker Comms Module");
console.log("Loading Extra Functions");
console.log("Configuring DB client: Postgres"); // Postgres configuration.

global.pool = new Pool({
  user: CONFIG.db.user,
  host: CONFIG.db.host,
  database: CONFIG.db.database,
  password: CONFIG.db.password,
  port: CONFIG.db.port
}); //Network functions

console.log("Configuring Server");
var app = express();
app.use(cors("*"));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(require('body-parser').urlencoded({
  extended: true
}));
app.use(_security.default.initialize());
app.post('/login', function (req, res, next) {
  _security.default.authenticate('custom', function (err, user, info) {
    // console.log("login_req",JSON.stringify(req))
    if (err) {
      res.json({
        status: "failed",
        payload: null
      });
    } else if (!user) {
      res.json({
        status: "unauthorised",
        payload: null
      });
    } else {
      res.json({
        status: "success",
        payload: user
      });
    }
  })(req, res, next);
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(function (req, res, next) {
  next();
});

function UMLSData() {
  return _UMLSData.apply(this, arguments);
}

function _UMLSData() {
  _UMLSData = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee39() {
    var semtypes, cui_def, cui_concept;
    return _regenerator.default.wrap(function _callee39$(_context39) {
      while (1) {
        switch (_context39.prev = _context39.next) {
          case 0:
            semtypes = new Promise(function (resolve, reject) {
              var inputStream = fs.createReadStream(CONFIG.system_path + "tools/metamap_api/" + 'cui_def.csv', 'utf8');
              var result = {};
              inputStream.pipe(new CsvReadableStream({
                parseNumbers: true,
                parseBooleans: true,
                trim: true,
                skipHeader: true
              })).on('data', function (row) {
                //console.log('A row arrived: ', row);
                row[4].split(";").map(function (st) {
                  result[st] = result[st] ? result[st] + 1 : 1;
                });
              }).on('end', function (data) {
                resolve(result);
              });
            });
            _context39.next = 3;
            return semtypes;

          case 3:
            semtypes = _context39.sent;
            cui_def = new Promise(function (resolve, reject) {
              var inputStream = fs.createReadStream(CONFIG.system_path + "tools/metamap_api/" + 'cui_def.csv', 'utf8');
              var result = {};
              inputStream.pipe(new CsvReadableStream({
                parseNumbers: true,
                parseBooleans: true,
                trim: true,
                skipHeader: true
              })).on('data', function (row) {
                //console.log('A row arrived: ', row);
                result[row[0]] = {
                  "matchedText": row[1],
                  "preferred": row[2],
                  "hasMSH": row[3],
                  "semTypes": row[4]
                };
              }).on('end', function (data) {
                resolve(result);
              });
            });
            _context39.next = 7;
            return cui_def;

          case 7:
            cui_def = _context39.sent;
            cui_concept = new Promise(function (resolve, reject) {
              var inputStream = fs.createReadStream(CONFIG.system_path + "tools/metamap_api/" + 'cui_concept.csv', 'utf8');
              var result = {};
              inputStream.pipe(new CsvReadableStream({
                parseNumbers: true,
                parseBooleans: true,
                trim: true,
                skipHeader: true
              })).on('data', function (row) {
                //console.log('A row arrived: ', row);
                result[row[0]] = row[1];
              }).on('end', function (data) {
                resolve(result);
              });
            });
            _context39.next = 11;
            return cui_concept;

          case 11:
            cui_concept = _context39.sent;
            return _context39.abrupt("return", {
              semtypes: semtypes,
              cui_def: cui_def,
              cui_concept: cui_concept
            });

          case 13:
          case "end":
            return _context39.stop();
        }
      }
    }, _callee39, this);
  }));
  return _UMLSData.apply(this, arguments);
}

function CUIData() {
  return _CUIData.apply(this, arguments);
} // Gets the labellers associated w ith each document/table.


function _CUIData() {
  _CUIData = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee40() {
    var umlsData, results, rres;
    return _regenerator.default.wrap(function _callee40$(_context40) {
      while (1) {
        switch (_context40.prev = _context40.next) {
          case 0:
            _context40.next = 2;
            return UMLSData();

          case 2:
            umlsData = _context40.sent;
            _context40.next = 5;
            return (0, _network_functions.getAnnotationResults)();

          case 5:
            results = _context40.sent;
            //
            //
            // var actual_results = new Promise( (resolve,reject) =>{
            //
            //         let inputStream = fs.createReadStream(CONFIG.system_path+ "tools/metamap_api/"+'Feb2020_allresults.csv', 'utf8');
            //
            //         var result = {};
            //
            //         inputStream
            //             .pipe(new CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true, skipHeader: true }))
            //             .on('data', function (row) {
            //
            //                 var currentItem = result[row[1]+"_"+row[2]] || {}
            //
            //                 // Only want one version of the annotations. There should be only one. If not, clean it up! As we have no automatic way to determine which one is best.
            //                 if ( (currentItem["user"] && currentItem["user"].length > 0) && (currentItem["user"] !== row[0])){
            //                    currentItem = {}
            //                 }
            //
            //                 currentItem["user"] = row[0]
            //
            //                 currentItem["minPos"] = currentItem["minPos"] && currentItem["minPos"] < row[6] ? currentItem["minPos"] : row[6]
            //
            //
            //                 var currentLoc = currentItem[row[5]] ? currentItem[row[5]] : {}
            //
            //                 currentLoc[row[6]] = { descriptors: row[7], modifier: row[8] }
            //
            //                 currentItem[row[5]] = currentLoc
            //
            //                 result[row[1]+"_"+row[2]] = currentItem
            //
            //             })
            //             .on('end', function (data) {
            //                 resolve(result);
            //             });
            //     })
            //
            // actual_results = await actual_results
            rres = results.rows.reduce(function (acc, ann, i) {
              var annots = ann.annotation.annotations;
              annots = annots.reduce(function (acc, ann) {
                var loc = ann.location;
                var n = ann.number;
                var descriptors = Object.keys(ann.content).join(";");
                var modifier = Object.keys(ann.qualifiers).join(";");
                acc[loc][n] = {
                  descriptors: descriptors,
                  modifier: modifier
                };
                return acc;
              }, {
                Col: {},
                Row: {}
              });
              acc[ann.docid + "_" + ann.page] = {
                user: ann.user,
                minPos: 1,
                Col: annots.Col,
                Row: annots.Row
              };
              return acc;
            }, {}); //
            // debugger

            return _context40.abrupt("return", {
              cui_def: umlsData.cui_def,
              cui_concept: umlsData.cui_concept,
              actual_results: rres,
              semtypes: umlsData.semtypes
            });

          case 8:
          case "end":
            return _context40.stop();
        }
      }
    }, _callee40, this);
  }));
  return _CUIData.apply(this, arguments);
}

function getMetadataLabellers() {
  return _getMetadataLabellers.apply(this, arguments);
} // Returns the annotation for a single document/table


function _getMetadataLabellers() {
  _getMetadataLabellers = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee41() {
    var client, result;
    return _regenerator.default.wrap(function _callee41$(_context41) {
      while (1) {
        switch (_context41.prev = _context41.next) {
          case 0:
            _context41.next = 2;
            return pool.connect();

          case 2:
            client = _context41.sent;
            _context41.next = 5;
            return client.query("select distinct docid, page, labeller from metadata");

          case 5:
            result = _context41.sent;
            client.release();
            return _context41.abrupt("return", result);

          case 8:
          case "end":
            return _context41.stop();
        }
      }
    }, _callee41, this);
  }));
  return _getMetadataLabellers.apply(this, arguments);
}

function getAnnotationByID(_x, _x2, _x3) {
  return _getAnnotationByID.apply(this, arguments);
} //
//
// var csvData = data.predicted.predictions.map(
//   (row_el,row) => {
//     return row_el.terms.map( ( term, col ) => {
//
//         var clean_concept = prepare_cell_text(term)
//         var row_terms = data.predicted.predictions[row].terms
//         // debugger;
//
//         var toReturn = {
//           docid: docid,
//           page: page,
//           concept : prepare_cell_text(term),
//           clean_concept : clean_concept,
//           original : term,
//           onlyNumbers : term.replace(/[^a-z]/g," ").replace(/ +/g," ").trim() == "",
//           // row: row,
//           // col: col,
//           pos_start: row == 0 ? 1 : "",
//           pos_middle: row > 0 && row < (data.predicted.predictions.length-1)  ? 1 : "",
//           pos_end: row == data.predicted.predictions.length-1 ? 1 : "",
//           // isCharacteristic_name: cols[col] && cols[col].descriptors.indexOf("characteristic_name") > -1 ? 1 : 0,
//           // isCharacteristic_level: cols[col] && cols[col].descriptors.indexOf("characteristic_level") > -1 ? 1 : 0,
//           // isOutcome: cols[col] && cols[col].descriptors.indexOf("outcomes") > -1 ? 1 : 0,
//           inRow : rows[row] ? 1 : "",
//           inCol : cols[col] ? 1 : "",
//           is_bold : data.predicted.predictions[row].cellClasses[col].indexOf("bold") > -1 ? 1 : "",
//           is_italic : data.predicted.predictions[row].cellClasses[col].indexOf("italic") > -1 ? 1 : "",
//           is_indent : data.predicted.predictions[row].cellClasses[col].indexOf("indent") > -1 ? 1 : "",
//           is_empty_row : row_terms[0] == row_terms.join("") ? 1 : "",
//           is_empty_row_p : row_terms.length > 2 && (row_terms[0]+row_terms[row_terms.length-1] == row_terms.join("")) ? 1 : "",  // this one is a crude estimation of P values structure. Assume the row has P value if multiple columns are detected but only first and last are populated.
//           label : cols[col] ? cols[col].descriptors : (rows[row] ? rows[row].descriptors : ""),
//           cuis: cui_data.cui_concept[clean_concept],
//           semanticTypes: getSemanticTypes(cui_data.cui_concept[clean_concept],cui_data).join(";"),
//
//           // cui_def, cui_concept
//         }
//
//         if ( cui_data.cui_concept[clean_concept] ){
//           cui_data.cui_concept[clean_concept].split(";").map( cui => {
//               toReturn[cui] = 1
//           })
//         }
//
//         getSemanticTypes(cui_data.cui_concept[clean_concept],cui_data).map( semType => {
//             toReturn[semType] = 1
//         })
//
//         return toReturn
//       })
//     }
//   )
// preinitialisation of components if needed.


function _getAnnotationByID() {
  _getAnnotationByID = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee42(docid, page, user) {
    var client, result;
    return _regenerator.default.wrap(function _callee42$(_context42) {
      while (1) {
        switch (_context42.prev = _context42.next) {
          case 0:
            _context42.next = 2;
            return pool.connect();

          case 2:
            client = _context42.sent;
            _context42.next = 5;
            return client.query('select * from annotations where docid=$1 AND page=$2 AND "user"=$3 order by docid desc,page asc', [docid, page, user]);

          case 5:
            result = _context42.sent;
            client.release();
            return _context42.abrupt("return", result);

          case 8:
          case "end":
            return _context42.stop();
        }
      }
    }, _callee42, this);
  }));
  return _getAnnotationByID.apply(this, arguments);
}

function main() {
  return _main.apply(this, arguments);
}

function _main() {
  _main = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee43() {
    return _regenerator.default.wrap(function _callee43$(_context43) {
      while (1) {
        switch (_context43.prev = _context43.next) {
          case 0:
            _context43.next = 2;
            return UMLSData();

          case 2:
            umls_data_buffer = _context43.sent;
            _context43.next = 5;
            return (0, _files.refreshDocuments)();

          case 5:
          case "end":
            return _context43.stop();
        }
      }
    }, _callee43, this);
  }));
  return _main.apply(this, arguments);
}

main();
app.get('/api/deleteTable',
/*#__PURE__*/
function () {
  var _ref = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee(req, res) {
    var filename, delprom;
    return _regenerator.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (!(req.query && req.query.docid && req.query.page)) {
              _context.next = 10;
              break;
            }

            filename = req.query.docid + "_" + req.query.page + ".html";
            delprom = new Promise(function (resolve, reject) {
              fs.rename(tables_folder + '/' + filename, tables_folder_deleted + '/' + filename, function (err) {
                if (err) {
                  reject("failed");
                }

                ;
                console.log('Move complete : ' + filename);
                resolve("done");
              });
            });
            _context.next = 5;
            return delprom;

          case 5:
            _context.next = 7;
            return (0, _files.refreshDocuments)();

          case 7:
            res.send("table deleted");
            _context.next = 11;
            break;

          case 10:
            res.send("table not deleted");

          case 11:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function (_x4, _x5) {
    return _ref.apply(this, arguments);
  };
}());
app.get('/api/recoverTable',
/*#__PURE__*/
function () {
  var _ref2 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee2(req, res) {
    var filename;
    return _regenerator.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            if (req.query && req.query.docid && req.query.page) {
              filename = req.query.docid + "_" + req.query.page + ".html";
              fs.rename(tables_folder_deleted + '/' + filename, tables_folder + '/' + filename, function (err) {
                if (err) throw err;
                console.log('Move complete : ' + filename);
              });
            }

            res.send("table recovered");

          case 2:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function (_x6, _x7) {
    return _ref2.apply(this, arguments);
  };
}());
app.get('/api/listDeletedTables',
/*#__PURE__*/
function () {
  var _ref3 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee3(req, res) {
    return _regenerator.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            fs.readdir(tables_folder_deleted, function (err, items) {
              if (err) {
                res.send("failed listing " + err);
              } else {
                res.send(items);
              }
            });

          case 1:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function (_x8, _x9) {
    return _ref3.apply(this, arguments);
  };
}());
app.get('/api/modifyCUIData',
/*#__PURE__*/
function () {
  var _ref4 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee5(req, res) {
    var modifyCUIData, result;
    return _regenerator.default.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            modifyCUIData =
            /*#__PURE__*/
            function () {
              var _ref5 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee4(cui, preferred, adminApproved, prevcui) {
                var client, result, q;
                return _regenerator.default.wrap(function _callee4$(_context4) {
                  while (1) {
                    switch (_context4.prev = _context4.next) {
                      case 0:
                        _context4.next = 2;
                        return pool.connect();

                      case 2:
                        client = _context4.sent;
                        _context4.next = 5;
                        return client.query("UPDATE cuis_index SET cui=$1, preferred=$2, admin_approved=$3 WHERE cui = $4", [cui, preferred, adminApproved, prevcui]);

                      case 5:
                        result = _context4.sent;

                        if (!(result && result.rowCount)) {
                          _context4.next = 11;
                          break;
                        }

                        q = new Query("UPDATE metadata SET cuis = array_to_string(array_replace(regexp_split_to_array(cuis, ';'), $2, $1), ';'), cuis_selected = array_to_string(array_replace(regexp_split_to_array(cuis_selected, ';'), $2, $1), ';')", [cui, prevcui]);
                        _context4.next = 10;
                        return client.query(q);

                      case 10:
                        result = _context4.sent;

                      case 11:
                        client.release();
                        return _context4.abrupt("return", result);

                      case 13:
                      case "end":
                        return _context4.stop();
                    }
                  }
                }, _callee4, this);
              }));

              return function modifyCUIData(_x12, _x13, _x14, _x15) {
                return _ref5.apply(this, arguments);
              };
            }();

            if (!(req.query && req.query.cui && req.query.preferred && req.query.adminApproved && req.query.prevcui)) {
              _context5.next = 8;
              break;
            }

            _context5.next = 4;
            return modifyCUIData(req.query.cui, req.query.preferred, req.query.adminApproved, req.query.prevcui);

          case 4:
            result = _context5.sent;
            res.send(result);
            _context5.next = 9;
            break;

          case 8:
            res.send("UPDATE failed");

          case 9:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function (_x10, _x11) {
    return _ref4.apply(this, arguments);
  };
}());
app.get('/api/cuiDeleteIndex',
/*#__PURE__*/
function () {
  var _ref6 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee7(req, res) {
    var cuiDeleteIndex;
    return _regenerator.default.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            cuiDeleteIndex =
            /*#__PURE__*/
            function () {
              var _ref7 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee6(cui) {
                var client, done;
                return _regenerator.default.wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        _context6.next = 2;
                        return pool.connect();

                      case 2:
                        client = _context6.sent;
                        _context6.next = 5;
                        return client.query('delete from cuis_index where cui = $1', [cui]).then(function (result) {
                          return console.log("deleted: " + new Date());
                        }).catch(function (e) {
                          return console.error(e.stack);
                        }).then(function () {
                          return client.release();
                        });

                      case 5:
                        done = _context6.sent;

                      case 6:
                      case "end":
                        return _context6.stop();
                    }
                  }
                }, _callee6, this);
              }));

              return function cuiDeleteIndex(_x18) {
                return _ref7.apply(this, arguments);
              };
            }();

            if (!(req.query && req.query.cui)) {
              _context7.next = 7;
              break;
            }

            _context7.next = 4;
            return cuiDeleteIndex(req.query.cui);

          case 4:
            res.send("done");
            _context7.next = 8;
            break;

          case 7:
            res.send("clear failed");

          case 8:
          case "end":
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function (_x16, _x17) {
    return _ref6.apply(this, arguments);
  };
}());
app.get('/api/getMetadataForCUI',
/*#__PURE__*/
function () {
  var _ref8 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee9(req, res) {
    var getCuiTables, meta;
    return _regenerator.default.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            getCuiTables =
            /*#__PURE__*/
            function () {
              var _ref9 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee8(cui) {
                var client, result;
                return _regenerator.default.wrap(function _callee8$(_context8) {
                  while (1) {
                    switch (_context8.prev = _context8.next) {
                      case 0:
                        _context8.next = 2;
                        return pool.connect();

                      case 2:
                        client = _context8.sent;
                        _context8.next = 5;
                        return client.query("select docid,page,\"user\" from metadata where cuis like $1 ", ["%" + cui + "%"]);

                      case 5:
                        result = _context8.sent;
                        client.release();
                        return _context8.abrupt("return", result);

                      case 8:
                      case "end":
                        return _context8.stop();
                    }
                  }
                }, _callee8, this);
              }));

              return function getCuiTables(_x21) {
                return _ref9.apply(this, arguments);
              };
            }(); //console.log(req.query)


            if (!(req.query && req.query.cui)) {
              _context9.next = 8;
              break;
            }

            _context9.next = 4;
            return getCuiTables(req.query.cui);

          case 4:
            meta = _context9.sent;
            //console.log(meta)
            res.send(meta);
            _context9.next = 9;
            break;

          case 8:
            res.send("clear failed");

          case 9:
          case "end":
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function (_x19, _x20) {
    return _ref8.apply(this, arguments);
  };
}());
app.get('/api/clearMetadata',
/*#__PURE__*/
function () {
  var _ref10 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee11(req, res) {
    var setMetadata;
    return _regenerator.default.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            setMetadata =
            /*#__PURE__*/
            function () {
              var _ref11 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee10(docid, page, user) {
                var client, done;
                return _regenerator.default.wrap(function _callee10$(_context10) {
                  while (1) {
                    switch (_context10.prev = _context10.next) {
                      case 0:
                        _context10.next = 2;
                        return pool.connect();

                      case 2:
                        client = _context10.sent;
                        _context10.next = 5;
                        return client.query('DELETE FROM metadata WHERE docid = $1 AND page = $2 AND "user" = $3', [docid, page, user]).then(function (result) {
                          return console.log("deleted: " + new Date());
                        }).catch(function (e) {
                          return console.error(e.stack);
                        }).then(function () {
                          return client.release();
                        });

                      case 5:
                        done = _context10.sent;

                      case 6:
                      case "end":
                        return _context10.stop();
                    }
                  }
                }, _callee10, this);
              }));

              return function setMetadata(_x24, _x25, _x26) {
                return _ref11.apply(this, arguments);
              };
            }();

            if (!(req.query && req.query.docid && req.query.page && req.query.user)) {
              _context11.next = 7;
              break;
            }

            _context11.next = 4;
            return setMetadata(req.query.docid, req.query.page, req.query.user);

          case 4:
            res.send("done");
            _context11.next = 8;
            break;

          case 7:
            res.send("clear failed");

          case 8:
          case "end":
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function (_x22, _x23) {
    return _ref10.apply(this, arguments);
  };
}());
app.get('/api/setMetadata',
/*#__PURE__*/
function () {
  var _ref12 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee13(req, res) {
    var setMetadata;
    return _regenerator.default.wrap(function _callee13$(_context13) {
      while (1) {
        switch (_context13.prev = _context13.next) {
          case 0:
            setMetadata =
            /*#__PURE__*/
            function () {
              var _ref13 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee12(docid, page, concept, cuis, qualifiers, cuis_selected, qualifiers_selected, user, istitle, labeller) {
                var client, done;
                return _regenerator.default.wrap(function _callee12$(_context12) {
                  while (1) {
                    switch (_context12.prev = _context12.next) {
                      case 0:
                        _context12.next = 2;
                        return pool.connect();

                      case 2:
                        client = _context12.sent;
                        _context12.next = 5;
                        return client.query('INSERT INTO metadata(docid, page, concept, cuis, qualifiers, "user", cuis_selected, qualifiers_selected, istitle, labeller ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (docid, page, concept, "user") DO UPDATE SET cuis = $4, qualifiers = $5, cuis_selected = $7, qualifiers_selected = $8, istitle = $9, labeller = $10', [docid, page, concept, cuis, qualifiers, user, cuis_selected, qualifiers_selected, istitle, labeller]).then(function (result) {
                          return console.log("insert: " + new Date());
                        }).catch(function (e) {
                          return console.error(e.stack);
                        }).then(function () {
                          return client.release();
                        });

                      case 5:
                        done = _context12.sent;

                      case 6:
                      case "end":
                        return _context12.stop();
                    }
                  }
                }, _callee12, this);
              }));

              return function setMetadata(_x29, _x30, _x31, _x32, _x33, _x34, _x35, _x36, _x37, _x38) {
                return _ref13.apply(this, arguments);
              };
            }();

            if (!(req.query && req.query.docid && req.query.page && req.query.concept && req.query.user)) {
              _context13.next = 7;
              break;
            }

            _context13.next = 4;
            return setMetadata(req.query.docid, req.query.page, req.query.concept, req.query.cuis || "", req.query.qualifiers || "", req.query.cuis_selected || "", req.query.qualifiers_selected || "", req.query.user, req.query.istitle, req.query.labeller);

          case 4:
            res.send("done");
            _context13.next = 8;
            break;

          case 7:
            res.send("insert failed");

          case 8:
          case "end":
            return _context13.stop();
        }
      }
    }, _callee13, this);
  }));

  return function (_x27, _x28) {
    return _ref12.apply(this, arguments);
  };
}());
app.get('/api/getMetadata',
/*#__PURE__*/
function () {
  var _ref14 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee15(req, res) {
    var getMetadata;
    return _regenerator.default.wrap(function _callee15$(_context15) {
      while (1) {
        switch (_context15.prev = _context15.next) {
          case 0:
            getMetadata =
            /*#__PURE__*/
            function () {
              var _ref15 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee14(docid, page, user) {
                var client, result;
                return _regenerator.default.wrap(function _callee14$(_context14) {
                  while (1) {
                    switch (_context14.prev = _context14.next) {
                      case 0:
                        _context14.next = 2;
                        return pool.connect();

                      case 2:
                        client = _context14.sent;
                        _context14.next = 5;
                        return client.query("SELECT docid, page, concept, cuis, cuis_selected, qualifiers, qualifiers_selected, \"user\",istitle, labeller FROM metadata WHERE docid = $1 AND page = $2 AND \"user\" = $3", [docid, page, user]);

                      case 5:
                        result = _context14.sent;
                        client.release();
                        return _context14.abrupt("return", result);

                      case 8:
                      case "end":
                        return _context14.stop();
                    }
                  }
                }, _callee14, this);
              }));

              return function getMetadata(_x41, _x42, _x43) {
                return _ref15.apply(this, arguments);
              };
            }();

            if (!(req.query && req.query.docid && req.query.page && req.query.user)) {
              _context15.next = 9;
              break;
            }

            _context15.t0 = res;
            _context15.next = 5;
            return getMetadata(req.query.docid, req.query.page, req.query.user);

          case 5:
            _context15.t1 = _context15.sent;

            _context15.t0.send.call(_context15.t0, _context15.t1);

            _context15.next = 10;
            break;

          case 9:
            res.send({
              error: "getMetadata_badquery"
            });

          case 10:
          case "end":
            return _context15.stop();
        }
      }
    }, _callee15, this);
  }));

  return function (_x39, _x40) {
    return _ref14.apply(this, arguments);
  };
}());
app.get('/', function (req, res) {
  res.send("TTidier Server running.");
});
app.get('/api/allInfo',
/*#__PURE__*/
function () {
  var _ref16 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee16(req, res) {
    var labellers, result, available_documents_temp, abs_index_temp, DOCS_temp;
    return _regenerator.default.wrap(function _callee16$(_context16) {
      while (1) {
        switch (_context16.prev = _context16.next) {
          case 0:
            _context16.next = 2;
            return getMetadataLabellers();

          case 2:
            labellers = _context16.sent;
            labellers = labellers.rows.reduce(function (acc, item) {
              acc[item.docid + "_" + item.page] = item.labeller;
              return acc;
            }, {});

            if (!(req.query && (req.query.filter_topic || req.query.filter_type || req.query.hua || req.query.filter_group || req.query.filter_labelgroup))) {
              _context16.next = 14;
              break;
            }

            _context16.next = 7;
            return (0, _table.prepareAvailableDocuments)(req.query.filter_topic ? req.query.filter_topic.split("_") : [], req.query.filter_type ? req.query.filter_type.split("_") : [], req.query.hua ? req.query.hua == "true" : false, req.query.filter_group ? req.query.filter_group.split("_") : [], req.query.filter_labelgroup ? req.query.filter_labelgroup.split("_") : []);

          case 7:
            result = _context16.sent;
            available_documents_temp = result.available_documents;
            abs_index_temp = result.abs_index;
            DOCS_temp = result.DOCS;
            res.send({
              abs_index: abs_index_temp,
              total: DOCS_temp.length,
              available_documents: available_documents_temp,
              msh_categories: msh_categories,
              labellers: labellers
            });
            _context16.next = 15;
            break;

          case 14:
            res.send({
              abs_index: abs_index,
              total: DOCS.length,
              available_documents: available_documents,
              msh_categories: msh_categories,
              labellers: labellers
            });

          case 15:
          case "end":
            return _context16.stop();
        }
      }
    }, _callee16, this);
  }));

  return function (_x44, _x45) {
    return _ref16.apply(this, arguments);
  };
}());

function getRecommendedCUIS() {
  return _getRecommendedCUIS.apply(this, arguments);
}

function _getRecommendedCUIS() {
  _getRecommendedCUIS = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee45() {
    var cuiRecommend, recommend_cuis, rec_cuis, splitConcepts;
    return _regenerator.default.wrap(function _callee45$(_context45) {
      while (1) {
        switch (_context45.prev = _context45.next) {
          case 0:
            cuiRecommend =
            /*#__PURE__*/
            function () {
              var _ref39 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee44() {
                var client, result;
                return _regenerator.default.wrap(function _callee44$(_context44) {
                  while (1) {
                    switch (_context44.prev = _context44.next) {
                      case 0:
                        _context44.next = 2;
                        return pool.connect();

                      case 2:
                        client = _context44.sent;
                        _context44.next = 5;
                        return client.query("select * from cuis_recommend");

                      case 5:
                        result = _context44.sent;
                        client.release();
                        return _context44.abrupt("return", result);

                      case 8:
                      case "end":
                        return _context44.stop();
                    }
                  }
                }, _callee44, this);
              }));

              return function cuiRecommend() {
                return _ref39.apply(this, arguments);
              };
            }();

            recommend_cuis = {};
            _context45.next = 4;
            return cuiRecommend();

          case 4:
            rec_cuis = _context45.sent.rows;

            splitConcepts = function splitConcepts(c) {
              if (c == null) {
                return [];
              }

              var ret = c[0] == ";" ? c.slice(1) : c; // remove trailing ;

              return ret.length > 0 ? ret.split(";") : [];
            };

            rec_cuis ? rec_cuis.map(function (item) {
              var cuis = splitConcepts(item.cuis);
              var rep_cuis = splitConcepts(item.rep_cuis);
              var excluded_cuis = splitConcepts(item.excluded_cuis);
              var rec_cuis = [];
              cuis.forEach(function (cui) {
                if (excluded_cuis.indexOf(cui) < 0) {
                  if (rep_cuis.indexOf(cui) < 0) {
                    rec_cuis.push(cui);
                  }
                }
              });
              recommend_cuis[item.concept] = {
                cuis: rep_cuis.concat(rec_cuis),
                cc: item.cc
              };
            }) : "";
            return _context45.abrupt("return", recommend_cuis);

          case 8:
          case "end":
            return _context45.stop();
        }
      }
    }, _callee45, this);
  }));
  return _getRecommendedCUIS.apply(this, arguments);
}

app.get('/api/cuiRecommend',
/*#__PURE__*/
function () {
  var _ref17 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee17(req, res) {
    var cuirec;
    return _regenerator.default.wrap(function _callee17$(_context17) {
      while (1) {
        switch (_context17.prev = _context17.next) {
          case 0:
            _context17.next = 2;
            return getRecommendedCUIS();

          case 2:
            cuirec = _context17.sent;
            res.send(cuirec);

          case 4:
          case "end":
            return _context17.stop();
        }
      }
    }, _callee17, this);
  }));

  return function (_x46, _x47) {
    return _ref17.apply(this, arguments);
  };
}());
app.get('/api/allMetadata',
/*#__PURE__*/
function () {
  var _ref18 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee19(req, res) {
    var allMetadataAnnotations;
    return _regenerator.default.wrap(function _callee19$(_context19) {
      while (1) {
        switch (_context19.prev = _context19.next) {
          case 0:
            allMetadataAnnotations =
            /*#__PURE__*/
            function () {
              var _ref19 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee18() {
                var client, result;
                return _regenerator.default.wrap(function _callee18$(_context18) {
                  while (1) {
                    switch (_context18.prev = _context18.next) {
                      case 0:
                        _context18.next = 2;
                        return pool.connect();

                      case 2:
                        client = _context18.sent;
                        _context18.next = 5;
                        return client.query("select * from metadata");

                      case 5:
                        result = _context18.sent;
                        client.release();
                        return _context18.abrupt("return", result);

                      case 8:
                      case "end":
                        return _context18.stop();
                    }
                  }
                }, _callee18, this);
              }));

              return function allMetadataAnnotations() {
                return _ref19.apply(this, arguments);
              };
            }();

            _context19.t0 = res;
            _context19.next = 4;
            return allMetadataAnnotations();

          case 4:
            _context19.t1 = _context19.sent;

            _context19.t0.send.call(_context19.t0, _context19.t1);

          case 6:
          case "end":
            return _context19.stop();
        }
      }
    }, _callee19, this);
  }));

  return function (_x48, _x49) {
    return _ref18.apply(this, arguments);
  };
}());
app.get('/api/cuisIndex',
/*#__PURE__*/
function () {
  var _ref20 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee21(req, res) {
    var getCUISIndex;
    return _regenerator.default.wrap(function _callee21$(_context21) {
      while (1) {
        switch (_context21.prev = _context21.next) {
          case 0:
            getCUISIndex =
            /*#__PURE__*/
            function () {
              var _ref21 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee20() {
                var cuis, client, result;
                return _regenerator.default.wrap(function _callee20$(_context20) {
                  while (1) {
                    switch (_context20.prev = _context20.next) {
                      case 0:
                        cuis = {};
                        _context20.next = 3;
                        return pool.connect();

                      case 3:
                        client = _context20.sent;
                        _context20.next = 6;
                        return client.query("select * from cuis_index");

                      case 6:
                        result = _context20.sent;
                        client.release();
                        result.rows.map(function (row) {
                          cuis[row.cui] = {
                            preferred: row.preferred,
                            hasMSH: row.hasMSH,
                            userDefined: row.user_defined,
                            adminApproved: row.admin_approved
                          };
                        });
                        return _context20.abrupt("return", cuis);

                      case 10:
                      case "end":
                        return _context20.stop();
                    }
                  }
                }, _callee20, this);
              }));

              return function getCUISIndex() {
                return _ref21.apply(this, arguments);
              };
            }();

            _context21.t0 = res;
            _context21.next = 4;
            return getCUISIndex();

          case 4:
            _context21.t1 = _context21.sent;

            _context21.t0.send.call(_context21.t0, _context21.t1);

          case 6:
          case "end":
            return _context21.stop();
        }
      }
    }, _callee21, this);
  }));

  return function (_x50, _x51) {
    return _ref20.apply(this, arguments);
  };
}());
app.get('/api/cuisIndexAdd',
/*#__PURE__*/
function () {
  var _ref22 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee23(req, res) {
    var insertCUI;
    return _regenerator.default.wrap(function _callee23$(_context23) {
      while (1) {
        switch (_context23.prev = _context23.next) {
          case 0:
            console.log(JSON.stringify(req.query));

            insertCUI =
            /*#__PURE__*/
            function () {
              var _ref23 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee22(cui, preferred, hasMSH) {
                var client, done;
                return _regenerator.default.wrap(function _callee22$(_context22) {
                  while (1) {
                    switch (_context22.prev = _context22.next) {
                      case 0:
                        _context22.next = 2;
                        return pool.connect();

                      case 2:
                        client = _context22.sent;
                        _context22.next = 5;
                        return client.query('INSERT INTO cuis_index(cui,preferred,"hasMSH",user_defined,admin_approved) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (cui) DO UPDATE SET preferred = $2, "hasMSH" = $3, user_defined = $4, admin_approved = $5', [cui, preferred, hasMSH, true, false]).then(function (result) {
                          return console.log("insert: " + new Date());
                        }).catch(function (e) {
                          return console.error(e.stack);
                        }).then(function () {
                          return client.release();
                        });

                      case 5:
                        done = _context22.sent;

                      case 6:
                      case "end":
                        return _context22.stop();
                    }
                  }
                }, _callee22, this);
              }));

              return function insertCUI(_x54, _x55, _x56) {
                return _ref23.apply(this, arguments);
              };
            }();

            if (!(req.query && req.query.cui.length > 0 && req.query.preferred.length > 0 && req.query.hasMSH.length > 0)) {
              _context23.next = 5;
              break;
            }

            _context23.next = 5;
            return insertCUI(req.query.cui, req.query.preferred, req.query.hasMSH);

          case 5:
            res.send("saved annotation: " + JSON.stringify(req.query));

          case 6:
          case "end":
            return _context23.stop();
        }
      }
    }, _callee23, this);
  }));

  return function (_x52, _x53) {
    return _ref22.apply(this, arguments);
  };
}());

function trainingData() {
  return _trainingData.apply(this, arguments);
}

function _trainingData() {
  _trainingData = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee46() {
    var cui_data, header, createCsvWriter, csvWriter, csvWriter_unique, count, docid, page, data, ac_res, cols, rows, annotation_cols, annotation_rows, cuirec, getSemanticTypes, csvData, csvDataUnique, allkeys, i, key;
    return _regenerator.default.wrap(function _callee46$(_context46) {
      while (1) {
        switch (_context46.prev = _context46.next) {
          case 0:
            _context46.next = 2;
            return CUIData();

          case 2:
            cui_data = _context46.sent;
            header = [{
              id: 'docid',
              title: 'docid'
            }, {
              id: 'page',
              title: 'page'
            }, {
              id: 'clean_concept',
              title: 'clean_concept'
            }, {
              id: 'is_bold',
              title: 'is_bold'
            }, {
              id: 'is_italic',
              title: 'is_italic'
            }, {
              id: 'is_indent',
              title: 'is_indent'
            }, {
              id: 'is_empty_row',
              title: 'is_empty_row'
            }, {
              id: 'is_empty_row_p',
              title: 'is_empty_row_p'
            }, {
              id: 'cuis',
              title: 'cuis'
            }, {
              id: 'semanticTypes',
              title: 'semanticTypes'
            }, {
              id: 'label',
              title: 'label'
            }]; //
            // Object.keys(cui_data.cui_def).map( c => {header.push({id: c, title: c})})
            // Object.keys(cui_data.semtypes).map( s => {header.push({id: s, title: s})})

            createCsvWriter = require('csv-writer').createObjectCsvWriter;
            csvWriter = createCsvWriter({
              path: 'training_data.csv',
              header: header
            });
            csvWriter_unique = createCsvWriter({
              path: 'training_data_unique.csv',
              header: header
            });
            count = 1;
            _context46.t0 = _regenerator.default.keys(available_documents);

          case 9:
            if ((_context46.t1 = _context46.t0()).done) {
              _context46.next = 51;
              break;
            }

            docid = _context46.t1.value;
            _context46.t2 = _regenerator.default.keys(available_documents[docid].pages);

          case 12:
            if ((_context46.t3 = _context46.t2()).done) {
              _context46.next = 49;
              break;
            }

            page = _context46.t3.value;
            console.log(docid + "  --  " + page + "  --  " + count + " / " + DOCS.length); //
            // count = count + 1;
            //
            // if ( count < 1800 ){
            //   continue
            // }

            page = available_documents[docid].pages[page];
            _context46.next = 18;
            return (0, _table.readyTableData)(docid, page);

          case 18:
            data = _context46.sent;
            ac_res = cui_data.actual_results;

            if (ac_res[docid + "_" + page]) {
              _context46.next = 22;
              break;
            }

            return _context46.abrupt("continue", 12);

          case 22:
            _context46.prev = 22;
            // These are manually annotated
            annotation_cols = Object.keys(ac_res[docid + "_" + page].Col).reduce(function (acc, e) {
              acc[e - 1] = ac_res[docid + "_" + page].Col[e];
              return acc;
            }, {});
            annotation_rows = Object.keys(ac_res[docid + "_" + page].Row).reduce(function (acc, e) {
              acc[e - 1] = ac_res[docid + "_" + page].Row[e];
              return acc;
            }, {});
            _context46.next = 31;
            break;

          case 27:
            _context46.prev = 27;
            _context46.t4 = _context46["catch"](22);
            console.log("skipping: " + docid + "_" + page);
            return _context46.abrupt("continue", 12);

          case 31:
            //Now we use the manual annotations here to build our dataset, to train the classifiers.
            cols = annotation_cols;
            rows = annotation_rows;
            _context46.next = 35;
            return getRecommendedCUIS();

          case 35:
            cuirec = _context46.sent;

            getSemanticTypes = function getSemanticTypes(cuis, cui_data) {
              if (!cuis) {
                return [];
              }

              var semType = [];
              cuis.split(";").map(function (cui) {
                semType.push(cui_data.cui_def[cui].semTypes.split(";"));
              });
              return semType.flat();
            };

            count = count + 1;
            csvData = data.predicted.predictions.map(function (row_el, row) {
              return row_el.terms.map(function (term, col) {
                // var clean_concept = prepare_cell_text(term)
                var row_terms = data.predicted.predictions[row].terms;
                var term_features = data.predicted.predictions[row].terms_features[col];
                var toReturn = {
                  docid: docid,
                  page: page,
                  clean_concept: term_features[0],
                  is_bold: term_features[1],
                  is_italic: term_features[2],
                  is_indent: term_features[3],
                  is_empty_row: term_features[4],
                  is_empty_row_p: term_features[5],
                  // this one is a crude estimation of P values structure. Assume the row has P value if multiple columns are detected but only first and last are populated.
                  cuis: term_features[6],
                  semanticTypes: term_features[7],
                  label: cols[col] ? cols[col].descriptors : rows[row] ? rows[row].descriptors : "" // This is the label selected by the annotating person : "subgroup_name; level etc. "
                  //
                  //

                };
                return toReturn;
              });
            }); // debugger;

            csvData = csvData.flat();
            csvDataUnique = [];
            allkeys = {};

            for (i = 0; i < csvData.length; i++) {
              key = Object.values(csvData[i]).join("");

              if (!allkeys[key]) {
                allkeys[key] = true;
                csvDataUnique.push(csvData[i]);
              }
            } //
            // debugger;


            _context46.next = 45;
            return csvWriter.writeRecords(csvData) // returns a promise
            .then(function () {
              console.log('...Done');
            });

          case 45:
            _context46.next = 47;
            return csvWriter_unique.writeRecords(csvDataUnique) // returns a promise
            .then(function () {
              console.log('...Done');
            });

          case 47:
            _context46.next = 12;
            break;

          case 49:
            _context46.next = 9;
            break;

          case 51:
            return _context46.abrupt("return", {});

          case 52:
          case "end":
            return _context46.stop();
        }
      }
    }, _callee46, this, [[22, 27]]);
  }));
  return _trainingData.apply(this, arguments);
}

app.get('/api/trainingData',
/*#__PURE__*/
function () {
  var _ref24 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee24(req, res) {
    var allP;
    return _regenerator.default.wrap(function _callee24$(_context24) {
      while (1) {
        switch (_context24.prev = _context24.next) {
          case 0:
            console.log("getting all training data");
            _context24.next = 3;
            return trainingData();

          case 3:
            allP = _context24.sent;
            res.send(allP);

          case 5:
          case "end":
            return _context24.stop();
        }
      }
    }, _callee24, this);
  }));

  return function (_x57, _x58) {
    return _ref24.apply(this, arguments);
  };
}()); // Generates the results table live preview, connecting to the R API.

app.get('/api/annotationPreview',
/*#__PURE__*/
function () {
  var _ref25 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee25(req, res) {
    var annotations, page, user, final_annotations, r, ann, existing, final_annotations_array, entry;
    return _regenerator.default.wrap(function _callee25$(_context25) {
      while (1) {
        switch (_context25.prev = _context25.next) {
          case 0:
            _context25.prev = 0;

            if (!(req.query && req.query.docid && req.query.docid.length > 0)) {
              _context25.next = 10;
              break;
            }

            page = req.query.page && req.query.page.length > 0 ? req.query.page : 1;
            user = req.query.user && req.query.user.length > 0 ? req.query.user : "";
            console.log(user + "  -- " + JSON.stringify(req.query));
            _context25.next = 7;
            return getAnnotationByID(req.query.docid, page, user);

          case 7:
            annotations = _context25.sent;
            _context25.next = 11;
            break;

          case 10:
            res.send({
              state: "badquery: " + JSON.stringify(req.query)
            });

          case 11:
            final_annotations = {};
            /**
            * There are multiple versions of the annotations. When calling reading the results from the database, here we will return only the latest/ most complete version of the annotation.
            * Independently from the author of it. Completeness here measured as the result with the highest number of annotations and the highest index number (I.e. Newest, but only if it has more information/annotations).
            * May not be the best in some cases.
            *
            */

            for (r in annotations.rows) {
              ann = annotations.rows[r];
              existing = final_annotations[ann.docid + "_" + ann.page];

              if (existing) {
                if (ann.N > existing.N && ann.annotation.annotations.length >= existing.annotation.annotations.length) {
                  final_annotations[ann.docid + "_" + ann.page] = ann;
                }
              } else {
                // Didn't exist so add it.
                final_annotations[ann.docid + "_" + ann.page] = ann;
              }
            }

            final_annotations_array = [];

            for (r in final_annotations) {
              ann = final_annotations[r];
              final_annotations_array[final_annotations_array.length] = ann;
            }

            if (final_annotations_array.length > 0) {
              entry = final_annotations_array[0];
              entry.annotation = entry.annotation.annotations.map(function (v, i) {
                var ann = v;
                ann.content = Object.keys(ann.content).join(";");
                ann.qualifiers = Object.keys(ann.qualifiers).join(";");
                return ann;
              });
              request({
                url: 'http://localhost:6666/preview',
                method: "POST",
                json: {
                  anns: entry
                }
              }, function (error, response, body) {
                res.send({
                  "state": "good",
                  result: body.tableResult,
                  "anns": body.ann
                });
              });
            } else {
              res.send({
                "state": "empty"
              });
            }

            _context25.next = 21;
            break;

          case 18:
            _context25.prev = 18;
            _context25.t0 = _context25["catch"](0);
            res.send({
              "state": "failed"
            });

          case 21:
          case "end":
            return _context25.stop();
        }
      }
    }, _callee25, this, [[0, 18]]);
  }));

  return function (_x59, _x60) {
    return _ref25.apply(this, arguments);
  };
}()); // Returns all annotations for all document/tables.

app.get('/api/formattedResults',
/*#__PURE__*/
function () {
  var _ref26 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee26(req, res) {
    var results, finalResults, r, ann, existing, finalResults_array, formattedRes;
    return _regenerator.default.wrap(function _callee26$(_context26) {
      while (1) {
        switch (_context26.prev = _context26.next) {
          case 0:
            _context26.next = 2;
            return (0, _network_functions.getAnnotationResults)();

          case 2:
            results = _context26.sent;

            if (results) {
              finalResults = {};
              /**
              * There are multiple versions of the annotations. When calling reading the results from the database, here we will return only the latest/ most complete version of the annotation.
              * Independently from the author of it. Completeness here measured as the result with the highest number of annotations and the highest index number (I.e. Newest, but only if it has more information/annotations).
              * May not be the best in some cases.
              *
              */

              for (r in results.rows) {
                ann = results.rows[r];
                existing = finalResults[ann.docid + "_" + ann.page];

                if (existing) {
                  if (ann.N > existing.N && ann.annotation.annotations.length >= existing.annotation.annotations.length) {
                    finalResults[ann.docid + "_" + ann.page] = ann;
                  }
                } else {
                  // Didn't exist so add it.
                  finalResults[ann.docid + "_" + ann.page] = ann;
                }
              }

              finalResults_array = [];

              for (r in finalResults) {
                ann = finalResults[r];
                finalResults_array[finalResults_array.length] = ann;
              }

              formattedRes = '"user","docid","page","corrupted_text","tableType","location","number","content","qualifiers"\n';
              finalResults_array.map(function (value, i) {
                value.annotation.annotations.map(function (ann, j) {
                  try {
                    formattedRes = formattedRes + '"' + value.user + '","' + value.docid + '","' + value.page // +'","'+value.corrupted
                    + '","' + (value.corrupted_text == "undefined" ? "" : value.corrupted_text).replace(/\"/g, "'") + '","' + value.tableType + '","' + ann.location + '","' + ann.number + '","' + Object.keys(ann.content).join(';') + '","' + Object.keys(ann.qualifiers).join(';') + '"' + "\n";
                  } catch (e) {
                    console.log("an empty annotation, no worries: " + JSON.stringify(ann));
                  }
                });
              });
              res.send(formattedRes);
            }

          case 4:
          case "end":
            return _context26.stop();
        }
      }
    }, _callee26, this);
  }));

  return function (_x61, _x62) {
    return _ref26.apply(this, arguments);
  };
}());
app.get('/api/abs_index', function (req, res) {
  var output = "";

  for (var i in abs_index) {
    output = output + i + "," + abs_index[i].docid + "," + abs_index[i].page + "\n";
  }

  res.send(output);
});
app.get('/api/totalTables', function (req, res) {
  res.send({
    total: DOCS.length
  });
});
app.get('/api/getMMatch',
/*#__PURE__*/
function () {
  var _ref27 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee28(req, res) {
    var getMMatch, mm_match;
    return _regenerator.default.wrap(function _callee28$(_context28) {
      while (1) {
        switch (_context28.prev = _context28.next) {
          case 0:
            getMMatch =
            /*#__PURE__*/
            function () {
              var _ref28 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee27(phrase) {
                var result;
                return _regenerator.default.wrap(function _callee27$(_context27) {
                  while (1) {
                    switch (_context27.prev = _context27.next) {
                      case 0:
                        console.log("LOOKING FOR: " + phrase);
                        result = new Promise(function (resolve, reject) {
                          request.post({
                            headers: {
                              'content-type': 'application/x-www-form-urlencoded'
                            },
                            url: 'http://localhost:8080/form',
                            body: "input=" + phrase + " &args=-AsI+ --JSONn -E"
                          }, function (error, res, body) {
                            if (error) {
                              reject(error);
                              return;
                            }

                            var start = body.indexOf('{"AllDocuments"');
                            var end = body.indexOf("'EOT'.");
                            resolve(body.slice(start, end));
                          });
                        });
                        return _context27.abrupt("return", result);

                      case 3:
                      case "end":
                        return _context27.stop();
                    }
                  }
                }, _callee27, this);
              }));

              return function getMMatch(_x65) {
                return _ref28.apply(this, arguments);
              };
            }();

            _context28.prev = 1;

            if (!(req.query && req.query.phrase)) {
              _context28.next = 9;
              break;
            }

            _context28.next = 5;
            return getMMatch(req.query.phrase);

          case 5:
            mm_match = _context28.sent;
            res.send(mm_match);
            _context28.next = 10;
            break;

          case 9:
            res.send({
              status: "wrong parameters",
              query: req.query
            });

          case 10:
            _context28.next = 15;
            break;

          case 12:
            _context28.prev = 12;
            _context28.t0 = _context28["catch"](1);
            console.log(_context28.t0);

          case 15:
          case "end":
            return _context28.stop();
        }
      }
    }, _callee28, this, [[1, 12]]);
  }));

  return function (_x63, _x64) {
    return _ref27.apply(this, arguments);
  };
}()); // POST method route

app.post('/saveTableOverride', function (req, res) {
  // debugger
  fs.writeFile("HTML_TABLES_OVERRIDE/" + req.body.docid + "_" + req.body.page + '.html', req.body.table, function (err) {
    if (err) throw err;
    console.log('Written replacement for: ' + req.body.docid + "_" + req.body.page + '.html');
  });
  res.send("alles gut!");
});
app.get('/api/removeOverrideTable',
/*#__PURE__*/
function () {
  var _ref29 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee29(req, res) {
    var file_exists;
    return _regenerator.default.wrap(function _callee29$(_context29) {
      while (1) {
        switch (_context29.prev = _context29.next) {
          case 0:
            if (!(req.query && req.query.docid && req.query.page)) {
              _context29.next = 8;
              break;
            }

            _context29.next = 3;
            return fs.existsSync("HTML_TABLES_OVERRIDE/" + req.query.docid + "_" + req.query.page + ".html");

          case 3:
            file_exists = _context29.sent;

            if (file_exists) {
              fs.unlink("HTML_TABLES_OVERRIDE/" + req.query.docid + "_" + req.query.page + ".html", function (err) {
                if (err) throw err;
                console.log("REMOVED : HTML_TABLES_OVERRIDE/" + req.query.docid + "_" + req.query.page + ".html");
              });
            }

            res.send({
              status: "override removed"
            });
            _context29.next = 9;
            break;

          case 8:
            res.send({
              status: "no changes"
            });

          case 9:
          case "end":
            return _context29.stop();
        }
      }
    }, _callee29, this);
  }));

  return function (_x66, _x67) {
    return _ref29.apply(this, arguments);
  };
}());
app.get('/api/classify',
/*#__PURE__*/
function () {
  var _ref30 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee30(req, res) {
    return _regenerator.default.wrap(function _callee30$(_context30) {
      while (1) {
        switch (_context30.prev = _context30.next) {
          case 0:
            if (!(req.query && req.query.terms)) {
              _context30.next = 8;
              break;
            }

            console.log(req.query.terms);
            _context30.t0 = res;
            _context30.next = 5;
            return classify(req.query.terms.split(","));

          case 5:
            _context30.t1 = _context30.sent;
            _context30.t2 = {
              results: _context30.t1
            };

            _context30.t0.send.call(_context30.t0, _context30.t2);

          case 8:
          case "end":
            return _context30.stop();
        }
      }
    }, _callee30, this);
  }));

  return function (_x68, _x69) {
    return _ref30.apply(this, arguments);
  };
}());
app.get('/api/getTable',
/*#__PURE__*/
function () {
  var _ref31 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee31(req, res) {
    var tableData;
    return _regenerator.default.wrap(function _callee31$(_context31) {
      while (1) {
        switch (_context31.prev = _context31.next) {
          case 0:
            _context31.prev = 0;

            if (!(req.query && req.query.docid && req.query.page && available_documents[req.query.docid] && available_documents[req.query.docid].pages.indexOf(req.query.page) > -1)) {
              _context31.next = 8;
              break;
            }

            _context31.next = 4;
            return (0, _table.readyTableData)(req.query.docid, req.query.page);

          case 4:
            tableData = _context31.sent;
            res.send(tableData);
            _context31.next = 9;
            break;

          case 8:
            res.send({
              status: "wrong parameters",
              query: req.query
            });

          case 9:
            _context31.next = 15;
            break;

          case 11:
            _context31.prev = 11;
            _context31.t0 = _context31["catch"](0);
            console.log(_context31.t0);
            res.send({
              status: "probably page out of bounds, or document does not exist",
              query: req.query
            });

          case 15:
          case "end":
            return _context31.stop();
        }
      }
    }, _callee31, this, [[0, 11]]);
  }));

  return function (_x70, _x71) {
    return _ref31.apply(this, arguments);
  };
}());
app.get('/api/getAvailableTables', function (req, res) {
  res.send(available_documents);
});
app.get('/api/getAnnotations',
/*#__PURE__*/
function () {
  var _ref32 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee32(req, res) {
    return _regenerator.default.wrap(function _callee32$(_context32) {
      while (1) {
        switch (_context32.prev = _context32.next) {
          case 0:
            _context32.t0 = res;
            _context32.next = 3;
            return (0, _network_functions.getAnnotationResults)();

          case 3:
            _context32.t1 = _context32.sent;

            _context32.t0.send.call(_context32.t0, _context32.t1);

          case 5:
          case "end":
            return _context32.stop();
        }
      }
    }, _callee32, this);
  }));

  return function (_x72, _x73) {
    return _ref32.apply(this, arguments);
  };
}());
app.get('/api/deleteAnnotation',
/*#__PURE__*/
function () {
  var _ref33 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee34(req, res) {
    var deleteAnnotation;
    return _regenerator.default.wrap(function _callee34$(_context34) {
      while (1) {
        switch (_context34.prev = _context34.next) {
          case 0:
            deleteAnnotation =
            /*#__PURE__*/
            function () {
              var _ref34 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee33(docid, page, user) {
                var client, done;
                return _regenerator.default.wrap(function _callee33$(_context33) {
                  while (1) {
                    switch (_context33.prev = _context33.next) {
                      case 0:
                        _context33.next = 2;
                        return pool.connect();

                      case 2:
                        client = _context33.sent;
                        _context33.next = 5;
                        return client.query('DELETE FROM annotations WHERE docid = $1 AND page = $2 AND "user" = $3', [docid, page, user]).then(function (result) {
                          return console.log("Annotation deleted: " + new Date());
                        }).catch(function (e) {
                          return console.error(e.stack);
                        }).then(function () {
                          return client.release();
                        });

                      case 5:
                        done = _context33.sent;

                      case 6:
                      case "end":
                        return _context33.stop();
                    }
                  }
                }, _callee33, this);
              }));

              return function deleteAnnotation(_x76, _x77, _x78) {
                return _ref34.apply(this, arguments);
              };
            }();

            if (!(req.query && req.query.docid && req.query.page && req.query.user)) {
              _context34.next = 7;
              break;
            }

            _context34.next = 4;
            return deleteAnnotation(req.query.docid, req.query.page, req.query.user);

          case 4:
            res.send("done");
            _context34.next = 8;
            break;

          case 7:
            res.send("delete failed");

          case 8:
          case "end":
            return _context34.stop();
        }
      }
    }, _callee34, this);
  }));

  return function (_x74, _x75) {
    return _ref33.apply(this, arguments);
  };
}());
app.get('/api/getAnnotationByID',
/*#__PURE__*/
function () {
  var _ref35 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee35(req, res) {
    var page, user, annotations, final_annotations, r, ann, existing, final_annotations_array, entry;
    return _regenerator.default.wrap(function _callee35$(_context35) {
      while (1) {
        switch (_context35.prev = _context35.next) {
          case 0:
            if (!(req.query && req.query.docid && req.query.docid.length > 0)) {
              _context35.next = 13;
              break;
            }

            page = req.query.page && req.query.page.length > 0 ? req.query.page : 1;
            user = req.query.user && req.query.user.length > 0 ? req.query.user : "";
            _context35.next = 5;
            return getAnnotationByID(req.query.docid, page, user);

          case 5:
            annotations = _context35.sent;
            final_annotations = {};
            /**
            * There are multiple versions of the annotations. When calling reading the results from the database, here we will return only the latest/ most complete version of the annotation.
            * Independently from the author of it. Completeness here measured as the result with the highest number of annotations and the highest index number (I.e. Newest, but only if it has more information/annotations).
            * May not be the best in some cases.
            *
            */

            for (r in annotations.rows) {
              ann = annotations.rows[r];
              existing = final_annotations[ann.docid + "_" + ann.page];

              if (existing) {
                if (ann.N > existing.N && ann.annotation.annotations.length >= existing.annotation.annotations.length) {
                  final_annotations[ann.docid + "_" + ann.page] = ann;
                }
              } else {
                // Didn't exist so add it.
                final_annotations[ann.docid + "_" + ann.page] = ann;
              }
            }

            final_annotations_array = [];

            for (r in final_annotations) {
              ann = final_annotations[r];
              final_annotations_array[final_annotations_array.length] = ann;
            }

            if (final_annotations_array.length > 0) {
              entry = final_annotations_array[0];
              res.send(entry);
            } else {
              res.send({});
            }

            _context35.next = 14;
            break;

          case 13:
            res.send({
              error: "failed request"
            });

          case 14:
          case "end":
            return _context35.stop();
        }
      }
    }, _callee35, this);
  }));

  return function (_x79, _x80) {
    return _ref35.apply(this, arguments);
  };
}());
app.get('/api/modelEval',
/*#__PURE__*/
function () {
  var _ref36 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee36(req, res) {
    var testingDocs, createCsvWriter, csvWriter, records, transferAnnotations, counter, doc, p, page, docid, tableData;
    return _regenerator.default.wrap(function _callee36$(_context36) {
      while (1) {
        switch (_context36.prev = _context36.next) {
          case 0:
            testingDocs = new Promise(function (resolve, reject) {
              var inputStream = fs.createReadStream(CONFIG.system_path + "testing_tables_list.csv", 'utf8');
              var testingDocs = [];
              inputStream.pipe(new CsvReadableStream({
                parseNumbers: true,
                parseBooleans: true,
                trim: true,
                skipHeader: true
              })).on('data', function (row) {
                testingDocs.push(row[0] + "_" + row[1]);
              }).on('end', function (data) {
                console.log("read testing docs list");
                resolve(testingDocs);
              });
            });
            _context36.next = 3;
            return testingDocs;

          case 3:
            testingDocs = _context36.sent;
            // debugger
            createCsvWriter = require('csv-writer').createObjectCsvWriter;
            csvWriter = createCsvWriter({
              path: CONFIG.system_path + 'predictor_results.csv',
              header: [{
                id: 'user',
                title: 'user'
              }, {
                id: 'docid',
                title: 'docid'
              }, {
                id: 'page',
                title: 'page'
              }, {
                id: 'corrupted',
                title: 'corrupted'
              }, {
                id: 'tableType',
                title: 'tableType'
              }, {
                id: 'location',
                title: 'location'
              }, {
                id: 'number',
                title: 'number'
              }, {
                id: 'content',
                title: 'content'
              }, {
                id: 'qualifiers',
                title: 'qualifiers'
              }]
            });
            records = [];

            transferAnnotations = function transferAnnotations(records, items, type) {
              items.map(function (p, i) {
                return records.push({
                  user: "auto",
                  docid: docid,
                  page: page,
                  corrupted: "false",
                  tableType: "na",
                  location: type == "Col" ? "Col" : "Row",
                  number: parseInt(p.c) + 1,
                  content: p.descriptors.join(";"),
                  qualifiers: p.unique_modifier.split(" ").join(";")
                });
              });
              return records;
            };

            counter = 0;
            _context36.t0 = _regenerator.default.keys(available_documents);

          case 10:
            if ((_context36.t1 = _context36.t0()).done) {
              _context36.next = 38;
              break;
            }

            doc = _context36.t1.value;
            _context36.t2 = _regenerator.default.keys(available_documents[doc].pages);

          case 13:
            if ((_context36.t3 = _context36.t2()).done) {
              _context36.next = 36;
              break;
            }

            p = _context36.t3.value;
            page = available_documents[doc].pages[p];
            docid = doc;
            console.log(counter + " / " + (testingDocs.length > 0 ? testingDocs.length : Object.keys(available_documents).length));

            if (!(testingDocs.indexOf(docid + "_" + page) < 0)) {
              _context36.next = 22;
              break;
            }

            return _context36.abrupt("continue", 13);

          case 22:
            counter++;

          case 23:
            _context36.prev = 23;
            _context36.next = 26;
            return (0, _table.readyTableData)(docid, page);

          case 26:
            tableData = _context36.sent;
            _context36.next = 33;
            break;

          case 29:
            _context36.prev = 29;
            _context36.t4 = _context36["catch"](23);
            console.log(docid + "_" + page + " :: Failed");
            return _context36.abrupt("continue", 13);

          case 33:
            if (tableData.predicted) {
              records = transferAnnotations(records, tableData.predicted.cols, "Col");
              records = transferAnnotations(records, tableData.predicted.rows, "Row");
            } else {
              console.log("no predicted data found");
              debugger;
            }

            _context36.next = 13;
            break;

          case 36:
            _context36.next = 10;
            break;

          case 38:
            // debugger
            csvWriter.writeRecords(records) // returns a promise
            .then(function () {
              res.send("Done experiments");
            });

          case 39:
          case "end":
            return _context36.stop();
        }
      }
    }, _callee36, this, [[23, 29]]);
  }));

  return function (_x81, _x82) {
    return _ref36.apply(this, arguments);
  };
}());
app.get('/api/recordAnnotation',
/*#__PURE__*/
function () {
  var _ref37 = (0, _asyncToGenerator2.default)(
  /*#__PURE__*/
  _regenerator.default.mark(function _callee38(req, res) {
    var insertAnnotation;
    return _regenerator.default.wrap(function _callee38$(_context38) {
      while (1) {
        switch (_context38.prev = _context38.next) {
          case 0:
            console.log("Recording Annotation: " + JSON.stringify(req.query));

            insertAnnotation =
            /*#__PURE__*/
            function () {
              var _ref38 = (0, _asyncToGenerator2.default)(
              /*#__PURE__*/
              _regenerator.default.mark(function _callee37(docid, page, user, annotation, corrupted, tableType, corrupted_text) {
                var client, done;
                return _regenerator.default.wrap(function _callee37$(_context37) {
                  while (1) {
                    switch (_context37.prev = _context37.next) {
                      case 0:
                        _context37.next = 2;
                        return pool.connect();

                      case 2:
                        client = _context37.sent;
                        _context37.next = 5;
                        return client.query('INSERT INTO annotations VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (docid, page,"user") DO UPDATE SET annotation = $4, corrupted = $5, "tableType" = $6, "corrupted_text" = $7 ;', [docid, page, user, annotation, corrupted, tableType, corrupted_text]).then(function (result) {
                          return console.log("insert: " + result);
                        }).catch(function (e) {
                          return console.error(e.stack);
                        }).then(function () {
                          return client.release();
                        });

                      case 5:
                        done = _context37.sent;

                      case 6:
                      case "end":
                        return _context37.stop();
                    }
                  }
                }, _callee37, this);
              }));

              return function insertAnnotation(_x85, _x86, _x87, _x88, _x89, _x90, _x91) {
                return _ref38.apply(this, arguments);
              };
            }();

            if (!(req.query && req.query.docid.length > 0 && req.query.page.length > 0 && req.query.user.length > 0 && req.query.annotation.length > 0)) {
              _context38.next = 5;
              break;
            }

            _context38.next = 5;
            return insertAnnotation(req.query.docid, req.query.page, req.query.user, {
              annotations: JSON.parse(req.query.annotation)
            }, req.query.corrupted, req.query.tableType, req.query.corrupted_text);

          case 5:
            res.send("saved annotation: " + JSON.stringify(req.query));

          case 6:
          case "end":
            return _context38.stop();
        }
      }
    }, _callee38, this);
  }));

  return function (_x83, _x84) {
    return _ref37.apply(this, arguments);
  };
}());
app.listen(CONFIG.port, function () {
  console.log('Table Tidier Server running on port ' + CONFIG.port + ' ' + new Date().toISOString());
});