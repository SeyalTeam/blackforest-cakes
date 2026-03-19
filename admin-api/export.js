var xl = require('excel4node');
var Order = require('../models/OrderModel');
var PastryOrder = require('../models/PastriesModel');
var messages = require('../utils/messages');
var Mongoose = require('mongoose');

var exportCalls = {
    downloadExcel: (req, res, next) => {
        try{
            // Create a new instance of a Workbook class
            var wb = new xl.Workbook();
            
            // Add Worksheets to the workbook
            var ws = wb.addWorksheet('Order');

            var headStyle = wb.createStyle({
                font: {
                  color: '#32100f',
                  size: 16,
                }
            });

            // Set value of cell A1 to 100 as a number type styled with paramaters of style
            ws.cell(1, 1)
            .string('S.No').style(headStyle);
                        
            ws.cell(1, 2)
            .string('OrderId').style(headStyle);
                        
            ws.cell(1, 3)
            .string('Price').style(headStyle);
            
            ws.cell(1, 4)
            .string('Discount').style(headStyle);
                        
            ws.cell(1, 5)
            .string('Balance').style(headStyle);

            ws.cell(1, 6)
            .string('Customer name').style(headStyle);

            ws.cell(1, 7)
            .string('Customer Phone').style(headStyle);

            ws.cell(1, 8)
            .string('Branch').style(headStyle);

            ws.cell(1, 9)
            .string('Salesman Id').style(headStyle);

            ws.cell(1, 10)
            .string('Delivery Date').style(headStyle);

            ws.cell(1, 11)
            .string('Delivery Status').style(headStyle);

            ws.cell(1, 12)
            .string('Delivery Type').style(headStyle);
            var sQuery = {};
            var branch = (req.query.branch) ? req.query.branch : '';
            var status = (req.query.status) ? req.query.status : '';

            if(branch){
                sQuery.branch = new Mongoose.Types.ObjectId(branch)
            }

            if(status){
                sQuery.status = status
            }

            if(req.query.sortBy){
              var sortOrder = req.query.sortBy;
              let dateNow = new Date();
              let prevDate;

              if(sortOrder === '1y'){
                prevDate =  dateNow.setMonth(dateNow.getMonth() - 12);
              } else if(sortOrder === '6m'){
                prevDate =  dateNow.setMonth(dateNow.getMonth() - 6);
              } else if(sortOrder === '1m'){
                prevDate =  dateNow.setMonth(dateNow.getMonth() - 1);
              } else if(sortOrder === '1w'){
                prevDate =  dateNow.setDate(dateNow.getDate() - 7);
              } else if(sortOrder === '1d'){
                prevDate =  dateNow.setDate(dateNow.getDate() -1);
              } 
              var now = new Date().setHours(0,0,0,0);
              prevDate = prevDate ? new Date(prevDate) : new Date(now);
              sQuery.created_at = { $gte: prevDate };
            }

            if(req.query.delivery){
              var sortOrder = req.query.delivery;
              let dateNow = new Date();
              let prevDate;

              if(sortOrder === '1w'){
                prevDate =  dateNow.setDate(dateNow.getDate() + 7);
              } else if(sortOrder === '1dn'){
                prevDate =  dateNow.setDate(dateNow.getDate()  + 1);
              } 
              prevDate = prevDate ? new Date(prevDate) : new Date();
              sQuery.delivery_date = { $gte: prevDate };
            }
            
            Order.find(sQuery).populate('branch sales_man').exec((err, response) => {
                if (err) {
                    res.status(400).json({
                        message: err.message
                    });
                  } else {

                    var cellStart = 2;
                    response.map((item, key) => {
                        ws.cell(cellStart, 1)
                        .number(key + 1);
                                    
                        ws.cell(cellStart, 2)
                        .string(item.form_no);
                                    
                        ws.cell(cellStart, 3)
                        .string(item.amount);

                        ws.cell(cellStart, 4)
                        .string((item.discount) ? item.discount : '-');

                        var adv = (item.advance) ? item.advance : 0;

                        ws.cell(cellStart, 5)
                        .string((item.balance) ? item.balance : ((parseFloat(item.amount) - parseFloat(adv))).toString());

                        ws.cell(cellStart, 6)
                        .string(item.customer_name);

                        ws.cell(cellStart, 7)
                        .string(item.customer_phone);

                        ws.cell(cellStart, 8)
                        .string(item.branch.branch);

                        ws.cell(cellStart, 9)
                        .string((item.sales_man)? item.sales_man.empcode : '-');

                        ws.cell(cellStart, 10)
                        .string((item.delivery_date).toString());

                        var status = (item.status === '1') ? 'Pending' : (item.status === '2') ? 'Cancel' : (item.status === '3') ? 'Completed' : '-'
 
                        ws.cell(cellStart, 11)
                        .string(status);

                        var type = (item.status === '1') ? 'Home' : (item.status === '2') ? 'Shop' : '-'

                        ws.cell(cellStart, 12)
                        .string(type);

                        cellStart = cellStart + 1;
                    });

                     wb.write('documents/Report.xlsx', function(err, stats) {
                        if (err) {
                            res.status(400).json({
                                message: err.message
                            });
                        } else {
                            res.json({
                                filename: 'Report.xlsx'
                            });
                        }
                    });
                  }
            })
        } catch(exp){
          console.log(exp);
          res.status(500).json({
              message: messages.exceptionMsg
          });
      }
    },
    downloadPastryExcel: (req, res, next) => {
      try{
          // Create a new instance of a Workbook class
          var wb = new xl.Workbook();
          
          // Add Worksheets to the workbook
          var ws = wb.addWorksheet('Pastry Orders');

          var headStyle = wb.createStyle({
              font: {
                color: '#32100f',
                size: 16,
              }
          });

          // Set value of cell A1 to 100 as a number type styled with paramaters of style
          ws.cell(1, 1)
          .string('S.No').style(headStyle);
                      
          ws.cell(1, 2)
          .string('OrderId').style(headStyle);
                      
          ws.cell(1, 3)
          .string('Total Ordered Items').style(headStyle);
          
          ws.cell(1, 4)
          .string('Total Price').style(headStyle);

          ws.cell(1, 5)
          .string('Total Send Items').style(headStyle);
          
          ws.cell(1, 6)
          .string('Total Send Item Price').style(headStyle);
                      
          ws.cell(1, 7)
          .string('SalesMan').style(headStyle);

          ws.cell(1, 8)
          .string('Items List').style(headStyle);


          var sQuery = {};
          var branch = (req.query.branch) ? req.query.branch : '';
          var createdBy = (req.query.user) ? req.query.user : '';
          var category = (req.query.category) ? req.query.category : '';
    
          if(branch){
              sQuery.branch = new Mongoose.Types.ObjectId(branch)
          }

          if (createdBy) {
            sQuery.created_by = new Mongoose.Types.ObjectId(createdBy)
          }
    
          if (category) {
            sQuery.category = new Mongoose.Types.ObjectId(category)
          }


          if(req.query.sortBy){
            var sortOrder = req.query.sortBy;
            let dateNow = new Date();
            let prevDate;

            if(sortOrder === '1y'){
              prevDate =  dateNow.setMonth(dateNow.getMonth() - 12);
            } else if(sortOrder === '6m'){
              prevDate =  dateNow.setMonth(dateNow.getMonth() - 6);
            } else if(sortOrder === '1m'){
              prevDate =  dateNow.setMonth(dateNow.getMonth() - 1);
            } else if(sortOrder === '1w'){
              prevDate =  dateNow.setDate(dateNow.getDate() - 7);
            } else if(sortOrder === '1d'){
              prevDate =  dateNow.setDate(dateNow.getDate() -1);
            } 
            var now = new Date().setHours(23,59,59,999);
            prevDate = prevDate ? new Date(prevDate) : new Date(now);
            sQuery.created_at = { $gte: prevDate };
          }

          if(req.query.delivery){
            var sortOrder = req.query.delivery;
            let dateNow = new Date();
            let prevDate;

            if(sortOrder === '1w'){
              prevDate =  dateNow.setDate(dateNow.getDate() + 7);
            } else if(sortOrder === '1dn'){
              prevDate =  dateNow.setDate(dateNow.getDate()  + 1);
            } 
            var now = new Date().setHours(0,0,0,0);

            prevDate = prevDate ? new Date(prevDate) : new Date(now);
            sQuery.delivery_date = { $gte: prevDate };
          }
          
          PastryOrder.find(sQuery).populate('created_by pastry._id').exec((err, response) => {
              if (err) {
                  res.status(400).json({
                      message: err.message
                  });
                } else {

                  var cellStart = 2;
                  response.map((item, key) => {

                      ws.cell(cellStart, 1)
                      .number(key + 1);
                                  
                      ws.cell(cellStart, 2)
                      .string(item.form_no);

                      ws.cell(cellStart, 3)
                      .string((item.qty) ? item.qty : '-');
     
                      ws.cell(cellStart, 4)
                      .string((item.total) ? item.total : '-');

                      ws.cell(cellStart, 5)
                      .string((item.sendQty) ? item.sendQty : '-');
     
                      ws.cell(cellStart, 6)
                      .string((item.sendTotal) ? item.sendTotal : '-');


                      ws.cell(cellStart, 7)
                      .string(item.created_by.firstname);

                      let itemsTxt = 'N/A';

                      if(item.pastry.length > 0){
                        let tempTxt = '';
                        item.pastry.forEach(element => {

                          // let tText = ('(Product: ' + element._id.name ? element._id.name: 'N/A' + ',Qty: ' + element.sendQty + ',Price: ' + element.sendTotal + '), \n');
                          let tText =(element._id && element._id.name) ? element._id.name + ',': 'N/A';
                          tempTxt += tText;

                        });
                        itemsTxt = tempTxt;
                      }

                      ws.cell(cellStart, 8)
                      .string(itemsTxt);
            
                      cellStart = cellStart + 1;
                  });

                   wb.write('documents/Report.xlsx', function(err, stats) {
                      if (err) {
                          res.status(400).json({
                              message: err.message
                          });
                      } else {
                          res.json({
                              filename: 'Report.xlsx'
                          });
                      }
                  });
                }
          })
      } catch(exp){
        console.log(exp);
        res.status(500).json({
            message: messages.exceptionMsg
        });
    }
  }
};

module.exports = exportCalls;