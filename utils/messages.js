var messages = {
    getAllMsg: 'successfully retrived all data',
    getOneMsg: 'successfully retrived data',
    exceptionMsg: 'something bad happened',
    validationMsg: 'validation error',
    noDataMsg: 'no data found',
    saveMsg: (type) => {
        return type + ' saved successfully'
    },
    deleteMsg: (type) => {
        return type + ' deleted successfully'
    },
    updateMsg: (type) => {
        return type + ' updated successfully'
    }
};

module.exports = messages;