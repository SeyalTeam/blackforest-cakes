var Mongoose = require("mongoose");
var messages = require('../utils/messages');
//models
var BranchCategory = require('../models/BranchStocksCategory');
var BranchProduct = require('../models/BranchStocksProduct');
var Store = require('../models/StoreModel');

var branchStocksCalls = {
    //abondon function
    createBranchCategory: async (req, res) => {
        try {
            const body = req.body;
            const option = { upsert: true, new: true, runValidators: true }
            let error = false;

            if (body.applyToAll == 1) {
                if (body.applyAllBranch == true) {
                    Store.find({}, function (err, results) {
                        if (err) {
                            error = true;
                        } else {
                            results.forEach(async (i) => {
                                const categoryUpdate = {
                                    branch: i._id,
                                    category: body.selectedCategory,
                                    isEnable: true
                                };
                                const q = { branch: i._id, category: body.selectedCategory };
                                const updateBranch = await BranchCategory.findOneAndUpdate(q, categoryUpdate, option);
                                body.products.forEach(async (p) => {
                                    const pq = { branch: body.selectedBranch, category: body.selectedCategory, product: p._id };
                                    const productUpdate = { ...categoryUpdate };
                                    productUpdate.qty = body.defaultStock;
                                    productUpdate.product = p._id;
                                    const updateProduct = await BranchProduct.findOneAndUpdate(pq, productUpdate, option);
                                })

                            })
                        }
                    })
                } else {
                    const categoryUpdate = {
                        branch: body.selectedBranch, category: body.selectedCategory,
                        isEnable: true
                    };
                    const q = { branch: body.selectedBranch, category: body.selectedCategory };
                    const updateBranch = await BranchCategory.findOneAndUpdate(q, categoryUpdate, option);
                    body.products.forEach(async (p) => {
                        const Prq = { branch: body.selectedBranch, category: body.selectedCategory, product: p._id };
                        const productUpdate = { ...categoryUpdate };
                        productUpdate.qty = body.defaultStock;
                        productUpdate.product = p._id;
                        const updateProduct = await BranchProduct.findOneAndUpdate(Prq, productUpdate, option);
                    })
                }
            } else {
                if (body.applyAllBranch == true) {
                    Store.find({}, function (err, results) {
                        if (err) {
                            error = true;
                        } else {
                            results.forEach(async (i) => {
                                const categoryUpdate = {
                                    branch: i._id, category: body.selectedCategory,
                                    isEnable: true
                                }
                                const q = { branch: i._id, category: body.selectedCategory };
                                const updateBranch = await BranchCategory.findOneAndUpdate(q, categoryUpdate, option);
                                body.products.forEach(async (p) => {
                                    categoryUpdate.isEnable = p.isSelected;
                                    const q2 = { branch: body.selectedBranch, category: body.selectedCategory, product: p._id };
                                    const productUpdate = { ...categoryUpdate };
                                    productUpdate.qty = p.qty;
                                    productUpdate.product = p._id;
                                    const updateProduct = await BranchProduct.findOneAndUpdate(q2, productUpdate, option);
                                });
                            })
                        }
                    })
                } else {
                    const categoryUpdate = {
                        branch: body.selectedBranch, category: body.selectedCategory,
                        isEnable: true
                    }
                    const q = { branch: body.selectedBranch, category: body.selectedCategory };

                    const updateBranch = await BranchCategory.findOneAndUpdate(q, categoryUpdate, option);
                    body.products.forEach(async (p) => {
                        categoryUpdate.isEnable = p.isSelected;
                        const pq = { branch: body.selectedBranch, category: body.selectedCategory, product: p._id };
                        const productUpdate = { ...categoryUpdate };
                        productUpdate.qty = p.qty;
                        productUpdate.product = p._id;
                        const updateProduct = await BranchProduct.findOneAndUpdate(pq, productUpdate, option);
                    })
                }
            }

            if (error == false) {
                res.status(200).json({
                    message: 'ok'
                });
            } else {
                res.status(400).json({
                    message: 'Failed to update stock'
                });
            }
        } catch (exception) {
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },
    createBranchCategoryAndProducts: async (req, res) => {
        try {
            const body = req.body;
            const option = { upsert: true, new: true, runValidators: true }
            let errors = [];
            let selectedBranch = false;
            let defStock = false;

            const allStores = await Store.find({});

            // all products choosed
            if (body.applyToAll == 1) {
                // all products apply for all branch
                if (body.applyAllBranch == true) {
                    allStores.forEach((oneStore) => {
                        createBCP(oneStore._id, true);
                    })
                } else {
                    // all products apply for selected branch
                    defStock = true;
                    selectedBranch = true;
                }
            } else {
                // selected products apply for all branch
                if (body.applyAllBranch == true) {
                    allStores.forEach((oneStore) => {
                        createBCP(oneStore._id)
                    })
                } else {
                    // selected products apply for selected branch
                    selectedBranch = true;
                }
            }

            if (selectedBranch === true) {
                createBCP(body.selectedBranch, defStock);
            }

            async function createBCP(branch, defaultStock = false) {
                const _details = { branch: branch, category: body.selectedCategory };
                const categoryFindQuery = { ..._details };
                const categoryBody = {
                    ..._details,
                    isEnable: true
                };
                // create category
                await BranchCategory.findOneAndUpdate(categoryFindQuery, categoryBody, option);
                // create product

                body.products.forEach(async (p) => {
                    const productQuery = { ..._details, product: p._id };
                    const productBody = {
                        ..._details,
                        product: p._id,
                        qty: defaultStock === true ? body.defaultStock : p.qty,
                        isEnable: p.isAddedAlready === true ? p.isSelected : true
                    };
                    await BranchProduct.findOneAndUpdate(productQuery, productBody, option);
                });
            }

            res.status(200).json({
                message: 'ok'
            });
        } catch (exception) {
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },
    disableCategory: (req, res) => {
        try {
            const body = req.body;
            const categoryUpdate = {
                isEnable: false
            }
            const q = { branch: body.selectedBranch, category: body.selectedCategory };

            BranchCategory.findOneAndUpdate(q, categoryUpdate, {}, function (err, doc) {
                if (err) {
                    res.status(400).json({
                        message: err.message,
                    });
                } else {
                    res.status(200).json({
                        message: 'ok',
                    });
                }
            });
        } catch (exception) {
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },
    getAllBranchCategory: (req, res) => {
        try {
            var branch = (req.query && req.query.branch) ? new Mongoose.Types.ObjectId(req.query.branch) : '';
            if (branch) {
                BranchCategory.find({ branch: branch })
                    .exec((err, items) => {
                        if (err) {
                            console.log(err);
                            res.status(400).json({
                                message: err.message,
                            });
                        } else {
                            res.status(200).json({
                                message: messages.getAllMsg,
                                data: items
                            });
                        }

                    });
            } else {
                res.status(200).json({
                    message: messages.noDataMsg
                });
            }
        } catch (exception) {
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },
    getAllBranchProducts: (req, res) => {
        try {
            var branch = (req.query && req.query.branch) ? new Mongoose.Types.ObjectId(req.query.branch) : '';
            var category = (req.query && req.query.category) ? new Mongoose.Types.ObjectId(req.query.category) : '';

            if (branch) {
                BranchProduct.find({ branch: branch, category: category })
                    .exec((err, items) => {
                        if (err) {
                            console.log(err);
                            res.status(400).json({
                                message: err.message,
                            });
                        } else {
                            res.status(200).json({
                                message: messages.getAllMsg,
                                data: items
                            });
                        }

                    });
            } else {
                res.status(200).json({
                    message: messages.noDataMsg
                });
            }
        } catch (exception) {
            res.status(500).json({
                message: messages.exceptionMsg
            });
        }
    },
    updateProStock: (req, res) => {
        const body = req.body;
        const option = { upsert: true, new: true, runValidators: true }
        const q = {
            branch: body.branch,
            category: body.category,
            product: body.product
        };

        if (body.id) {
            q._id = body.id;
        }

        const productUpdate = {
        };

        productUpdate.isEnable = body.state;

        if (body.qty) {
            productUpdate.qty = body.qty;
        }


        if (body.product) {
            productUpdate.product = body.product;
        }

        BranchProduct.findOneAndUpdate(q, productUpdate, option, (err, result) => {
            if (err) {
                res.status(400).json({
                    message: err.message
                });
            } else {

                res.status(200).json({
                    message: messages.updateMsg('product'),
                });
            }
        })

    },
};

module.exports = branchStocksCalls;