// packages
var { validationResult } = require("express-validator");
var bcrypt = require("bcrypt");
var Mongoose = require("mongoose");
const fs = require("fs-extra");
var pushNotify = require("../utils/notification");

//files
var messages = require("../utils/messages");
var constants = require("../config/constants");
// var AWS = require('../config/aws');

//models
var Employee = require("../models/EmployeeModel");
var Store = require("../models/StoreModel");

var employeeCalls = {
  getAllStoreData: (req, res, next) => {
    try {
      Store.find({}, (err, stores) => {
        if (err) {
          console.log(err);
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: stores,
          });
        }
      });
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getAllBranchEmployeeData: (req, res, next) => {
    try {
      Employee.find({ emptype: 4 }, "firstname lastname phone", (err, lists) => {
        if (err) {
          console.log(err);
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: lists,
          });
        }
      });
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getAll: (req, res, next) => {
    try {
      var currentPage =
        req.query && req.query.page ? parseInt(req.query.page) : 0;
      var limit = 15;
      var skip = currentPage * limit;
      var cond = [
        {
          $lookup: {
            from: "stores",
            localField: "branch",
            foreignField: "_id",
            as: "store",
          },
        },
        {
          $facet: {
            paginatedResults: [{ $skip: skip }, { $limit: limit }],
            totalCount: [
              {
                $count: "count",
              },
            ],
          },
        },
      ];

      var empName = req.query && req.query.emp ? req.query.emp : "";
      var branchName = req.query && req.query.branch ? req.query.branch : "";
      var type = req.query && req.query.type ? req.query.type : "";
      var sQuery = {};

      if (empName) {
        sQuery = {
          $or: [
            { firstname: { $regex: empName, $options: "i" } },
            { lastname: { $regex: empName, $options: "i" } },
            { empcode: { $regex: empName, $options: "i" } },
          ],
        };
      }

      if (branchName) {
        const newId = new Mongoose.Types.ObjectId(branchName);

        sQuery.branch = newId;
      }

      if (type) {
        sQuery.emptype = parseInt(type);
      }
      if (branchName || type || empName) {
        cond = [
          {
            $match: sQuery,
          },
          {
            $lookup: {
              from: "stores",
              localField: "branch",
              foreignField: "_id",
              as: "store",
            },
          },
          {
            $facet: {
              paginatedResults: [{ $skip: skip }, { $limit: limit }],
              totalCount: [
                {
                  $count: "count",
                },
              ],
            },
          },
        ];
      }

      Employee.aggregate(cond).exec((err, employees) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          Store.find({}, (err, stores) => {
            if (err) {
              console.log(err);
            } else {
              res.status(200).json({
                message: messages.getAllMsg,
                store: stores,
                data: employees,
              });
            }
          });
        }
      });
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getOne: (req, res, next) => {
    try {
      var empId = req.params.id;

      Employee.findById(empId).exec((err, data) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        }
        res.status(200).json({
          message: messages.getOneMsg,
          data: data,
        });
      });
    } catch (exception) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  create: (req, res, next) => {
    try {
      var file = req.file;
      var iData = req.body;
      var errors = validationResult(req);

      if (!errors.isEmpty()) {
        res.status(422).json({
          message: messages.validationMsg,
          errors: errors.array(),
        });
      } else {
        bcrypt.hash(iData.password, constants.saltRounds, (err, hash) => {
          if (err) {
            res.status(400).json({
              message: err.message,
            });
          } else {
            var saveData = {
              firstname: iData.firstname,
              lastname: iData.lastname,
              // phone: iData.phone,
              // address: iData.address,
              // email: iData.email,
              // branch: iData.branch,
              username: iData.username,
              emptype: iData.type,
              password: hash,
            };

            if (iData.branch) {
              saveData.branch = iData.branch;
            }

            if (iData.phone) {
              saveData.phone = iData.phone;
            }

            if (iData.address) {
              saveData.address = iData.address;
            }

            if (iData.email) {
              saveData.email = iData.email;
            }

            if (iData.isOTPLogin) {
              saveData.isOTPLogin = iData.isOTPLogin;
            }

            if (iData.phone) {
              Employee.findOne({ phone: iData.phone }, (err, records) => {
                if (err) {
                  res.status(400).json({
                    message: err.message,
                  });
                } else if (records) {
                  res.status(400).json({
                    message: "Phone number already exists.",
                  });
                } else {
                  Employee.findOne().sort({
                    "empcode": -1
                  }).collation({ locale: "en_US", numericOrdering: true }).exec((error, c) => {
                    if (error) {
                      res.status(400).json({
                        message: error.message,
                      });
                    } else {
                      // if (!c) c = 0;
                      // saveData.empcode = c + 1;

                      saveData.empcode = parseInt(c.empcode) + 1;

                      if (file) {
                        saveData.image = file.filename;
                        var createEmployee = new Employee(saveData);

                        createEmployee.save((err, result) => {
                          if (!err) {
                            res.status(201).json({
                              message: messages.saveMsg("employee"),
                            });
                          }
                        });

                        // var s3 = new AWS.S3();
                        // var s3Pathname = 'employee/';
                        // var s3FileName = 'bkcakepic-' + Date.now() + '.' + helpers.getFileExt(file.originalname);
                        // var params = {
                        //   Bucket: 'blackforestbasket',
                        //   Key: s3Pathname + s3FileName,
                        //   Body: file.buffer,
                        // };

                        // s3.upload(params, function(err, data) {
                        //   if (err) {
                        //       throw err;
                        //   }
                        //   saveData.image = s3FileName;
                        //   var createEmployee = new Employee(saveData);
                        //   createEmployee.save((err, result) => {
                        //     if(err){
                        //         res.status(400).json({
                        //             message: err.message
                        //         });
                        //     } else{
                        //         res.status(201).json({
                        //             message: messages.saveMsg('employee')
                        //         });
                        //     }
                        //   })
                        // });
                      } else {
                        var createEmployee = new Employee(saveData);
                        createEmployee.save((err, result) => {
                          if (err) {
                            console.log(err);
                            res.status(400).json({
                              message: err.message,
                            });
                          } else {
                            res.status(201).json({
                              message: messages.saveMsg("employee"),
                            });
                          }
                        });
                      }
                    }
                  });
                }
              });
            } else {
              Employee.findOne().sort({
                "empcode": -1
              }).collation({ locale: "en_US", numericOrdering: true }).exec((error, c) => {
                if (error) {
                  res.status(400).json({
                    message: error.message,
                  });
                } else {
                  saveData.empcode = parseInt(c.empcode) + 1;

                  if (file) {
                    saveData.image = file.filename;
                    var createEmployee = new Employee(saveData);

                    createEmployee.save((err, result) => {
                      if (!err) {
                        res.status(201).json({
                          message: messages.saveMsg("employee"),
                        });
                      }
                    });

                    // var s3 = new AWS.S3();
                    // var s3Pathname = 'employee/';
                    // var s3FileName = 'bkcakepic-' + Date.now() + '.' + helpers.getFileExt(file.originalname);
                    // var params = {
                    //   Bucket: 'blackforestbasket',
                    //   Key: s3Pathname + s3FileName,
                    //   Body: file.buffer,
                    // };

                    // s3.upload(params, function(err, data) {
                    //   if (err) {
                    //       throw err;
                    //   }
                    //   saveData.image = s3FileName;
                    //   var createEmployee = new Employee(saveData);
                    //   createEmployee.save((err, result) => {
                    //     if(err){
                    //         res.status(400).json({
                    //             message: err.message
                    //         });
                    //     } else{
                    //         res.status(201).json({
                    //             message: messages.saveMsg('employee')
                    //         });
                    //     }
                    //   })
                    // });
                  } else {
                    var createEmployee = new Employee(saveData);
                    createEmployee.save((err, result) => {
                      if (err) {
                        console.log(err);
                        res.status(400).json({
                          message: err.message,
                        });
                      } else {
                        res.status(201).json({
                          message: messages.saveMsg("employee"),
                        });
                      }
                    });
                  }
                }
              });
            }
          }
        });
      }
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  updateEmployees: (req, res, next) => {
    try {
      var empId = req.params.id;
      var incData = req.body;
      var file = req.file;

      Employee.findById(empId, (err, empData) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          if (empData) {
            var updateData = {
              address: incData.address,
              firstname: incData.firstname,
              lastname: incData.lastname,
              phone: incData.phone,
              emptype: incData.type,
            };

            if (incData.branch) {
              updateData.branch = incData.branch;
            }

            if (incData.password) {
              updateData.password = incData.password;
            }

            // if (incData.empcode) {
            //   updateData.empcode = incData.empcode;
            // }

            if (!incData.branch) {
              Employee.updateOne(
                { _id: empId },
                { $unset: { branch: 1 } },
                (err, resp) => {
                  // console.log(err);
                }
              );
            }

            if (incData.isOTPLogin) {
              updateData.isOTPLogin = incData.isOTPLogin;
            } else {
              updateData.isOTPLogin = false;
            }

            if (incData.phone && empData.phone !== incData.phone) {
              Employee.findOne({ phone: incData.phone }, (err, records) => {
                if (err) {
                  res.status(400).json({
                    message: err.message,
                  });
                } else if (records) {
                  res.status(400).json({
                    message: "Phone number already exists.",
                  });
                } else {
                  if (file) {
                    if (empData.image) {
                      const path = "./uploads/" + empData.image;
                      fs.remove(path, (err) => {
                        if (err) return console.log(err);
                      });

                      updateData.image = file.filename;
                      employeeCalls.processUpdate(req, res, updateData, empId);
                    } else {
                      updateData.image = file.filename;
                      employeeCalls.processUpdate(req, res, updateData, empId);
                    }
                  } else {
                    employeeCalls.processUpdate(req, res, updateData, empId);
                  }
                }
              });
            } else {
              if (file) {
                if (empData.image) {
                  const path = "./uploads/" + empData.image;
                  fs.remove(path, (err) => {
                    if (err) return console.log(err);
                  });

                  updateData.image = file.filename;
                  employeeCalls.processUpdate(req, res, updateData, empId);
                } else {
                  updateData.image = file.filename;
                  employeeCalls.processUpdate(req, res, updateData, empId);
                }
              } else {
                employeeCalls.processUpdate(req, res, updateData, empId);
              }
            }
          } else {
            res.status(404).json({
              message: messages.noDataMsg,
            });
          }
        }
      });
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  processUpdate: (req, res, updateData, id) => {
    if (updateData.password) {
      bcrypt.hash(updateData.password, constants.saltRounds, (err, hash) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          updateData.password = hash;

          Employee.updateOne({ _id: id }, updateData, (err, result) => {
            if (err) {
              res.status(400).json({
                message: err.message,
              });
            } else {
              res.status(200).json({
                message: messages.updateMsg("employee"),
              });
            }
          });
        }
      });
    } else {
      Employee.updateOne({ _id: id }, updateData, (err, result) => {
        if (err) {
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: messages.updateMsg("employee"),
          });
        }
      });
    }
  },

  deleteEmployee: (req, res, next) => {
    try {
      var empId = req.params.id;
      Employee.findById(empId, (err, result) => {
        if (err) {
          console.log(err);

          res.status(400).json({
            message: err.message,
          });
        } else {
          if (result && result.image) {
            const path = "./uploads/" + result.image;
            fs.remove(path, (err) => {
              if (err) return console.log(err);
            });
            Employee.deleteOne({ _id: empId }, (err, d) => {
              if (err) {
                res.status(400).json({
                  message: err.message,
                });
              } else {
                res.status(200).json({
                  message: messages.deleteMsg("employee"),
                });
              }
            });

            // var s3 = new AWS.S3();
            // var s3Pathname = 'employee/';

            // var params = {
            //   Bucket: 'blackforestbasket',
            //   Key: s3Pathname + result.image
            // };

            // s3.deleteObject(params, function (err, data) {
            //   if (data) {
            //       Employee.deleteOne({_id: empId}, (err, d) => {
            //           if(err){
            //         res.status(400).json({
            //           message: err.message
            //         });
            //       }

            //       res.status(200).json({
            //         message: messages.deleteMsg('employee')
            //       });
            //     })
            //   } else {
            //     res.status(500).json({
            //       message: err.message
            //     });
            //   }
            // });
          } else {
            Employee.deleteOne({ _id: empId }, (err, d) => {
              if (err) {
                res.status(400).json({
                  message: err.message,
                });
              }

              res.status(200).json({
                message: messages.deleteMsg("employee"),
              });
            });
          }
        }
      });
    } catch (exception) {
      console.log(exception);
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getEmployeesByChefsAndDeliveryBoy: (req, res, next) => {
    try {
      Employee.find(
        { $or: [{ emptype: 2 }, { emptype: 3 }] },
        (err, stores) => {
          if (err) {
            console.log(err);
            res.status(400).json({
              message: err.message,
            });
          } else {
            res.status(200).json({
              message: messages.getAllMsg,
              data: stores,
            });
          }
        }
      );
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },

  getAllEmployees: (req, res, next) => {
    try {
      Employee.find(
        {},
        "firstname image latitude longitude emptype image"
      ).exec((err, Employees) => {
        if (err) {
          console.log(err);
          res.status(400).json({
            message: err.message,
          });
        } else {
          res.status(200).json({
            message: messages.getAllMsg,
            data: Employees,
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
  forceLogout: (req, res, next) => {
    try {
      var employee = req.params.emp;
      Employee.findOne({ _id: employee }).exec((err, employees) => {
        if (err) {
          console.log(err);
          res.status(400).json({
            message: err.message,
          });
        } else if (employees) {
          Employee.updateOne(
            { _id: employee },
            { isEnable: !employees.isEnable },
            (err, result) => {
              if (err) {
                res.status(400).json({
                  message: err.message,
                });
              } else {
                if (employees.isEnable === true) {
                  pushNotify.sendForceLogoutNotification(employee);
                }
                res.status(200).json({
                  message: messages.updateMsg("employee"),
                });
              }
            }
          );
        } else {
          res.status(404).json({
            message: messages.noDataMsg,
          });
        }
      });
    } catch (exp) {
      res.status(500).json({
        message: messages.exceptionMsg,
      });
    }
  },
};

module.exports = employeeCalls;
