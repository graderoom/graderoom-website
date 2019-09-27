const axios = require('axios')

const apiKey = ''; //todo
const baseUrl = 'http://localhost:5000/api/' //todo

module.exports = {
    createAPIuser: function(school_email, school_password) {
        //returns api id
        axios.post(baseUrl + 'create_user', {
            school_email: school_email,
            school_password: school_password,
        }).then(resp => {
            return {success: true, id: resp.data.id}
        }).catch(error => {
            console.log('error'+ error)
            return {success: false, error: error}
        })
    },

    getGrades: function(api_id) {
        axios.get(baseUrl + '')

    }

}