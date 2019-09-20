from flask import Flask
from flask import request   
from pymongo import MongoClient

class DBHandler:

    def __init__(self):
            client = MongoClient() #defaults
            big_db = client["graderoom-backend"]
            self.db = big_db['users'] # only user collection for now

    def get_user(self, user_id):
        return self.db.find_one({"_id": user_id})

    def add_user(self, username, password, school_email, school_password):
        # print(username + " | " + password + " | " + school_email + " | " + school_password)
        user = {
            #'_id': 1, #todo randomly generate a number/string or increment? or use mongo's built in
            'school_email': school_email,
            'school_password': school_password,
            'classes': []
        }
        print("inserting!")
        x = self.db.insert_one(user)
        print(x)
        #todo json response
        print("Done!")

    def get_all_users(self):
        all = list(self.db.find({}))
        ret_str = ''
        for user in all:
            ret_str += str(user) + '\n'

        return ret_str    

db = DBHandler()
app = Flask(__name__)

@app.route('/api/')
def api_blank():
    return '?'

@app.route('/api/get_grades/<user_id>')
def get_grades(user_id):
    return user_id

@app.route('/api/create_user/', methods = ['POST'])
def api_add_user():
    data = request.form
    # todo error handling here
    db.add_user(data['un'], data['ps'], data['se'], data['sp'])
    return data

@app.route('/api/get_user/<user_id>')
def get_user_from_id(user_id):
    return db.get_user(user_id)

@app.route('/api/get_all_users')
def get_all_users():
    return db.get_all_users()

if __name__ == "__main__":
    app.run(debug=True)  
    

'''
Example Grade Object:
    {
    'class_name': 'Computer Science A AP',
    'teacher': 'Brown, Lewis',
    'overall_percent': 92,
    'overall_letter': 'A-',
    'grades': 
    [
        {
            'assignment_name': 'InheritsA1',
            'grade_percent': 83.33,
            'points_gotten': 2.5,
            'points_possible': 3
        },
        {
            'assignment_name': 'InheritsA2',
            'grade_percent': 100,
            'points_gotten': 5,
            'points_possible': 5,
        }
    ]
    }
'''