from flask import Flask
import pymongo

class DBHandler:

    def __init__(self):
            client = pymongo.MongoClient("mongodb://localhost:27017/")
            big_db = client["graderoom"]
            self.db = big_db['users'] # only user collection for now

    def get_user(self, user_id):
        pass

    def add_user(self, username, password, school_email, school_password):
        print(username + " | " + password + " | " + school_email + " | " + school_password)
        user = {
            '_id': 1, #todo randomly generate a number/string or increment?
            'username': username,
            'password': password,
            'school_email': school_email,
            'school_password': school_password,
        }
        
        self.db.insert_one(user)
        print("Done!")

db = DBHandler()
app = Flask(__name__)

@app.route('/api/')
def api_blank():
    return '?'

@app.route('/api/get_grades/<user_id>')
def get_grades(user_id):
    return "F F F F F"

@app.route('/api/create_user/', methods = ['POST'])
def api_add_user():
    data = request.form
    # todo error handling here
    db.add_user(data['un'], data['ps'], data['se'], data['sp'])


if __name__ == "__main__":

    # app.run(debug=True)  
    

