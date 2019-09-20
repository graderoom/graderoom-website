from flask import Flask
from flask import request   
from pymongo import MongoClient
from scrape import PowerschoolScraper
import string
from bson.json_util import loads, dumps
import random

def randomString(stringLength=10):
    """Generate a random string of fixed length """
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(stringLength))

class DBHandler:

    def __init__(self):
            client = MongoClient() #defaults
            big_db = client["graderoom-backend"]
            self.db = big_db['users'] # only user collection for now

    def get_user(self, user_id, asString = False):
        usr = self.db.find_one({"id": user_id})
        print(usr['school_email'])    
        if asString:
            return dumps(usr)
        return usr
        
    def add_user(self, username, password, school_email, school_password): #todo do we want to handle user auth here?
        # print(username + " | " + password + " | " + school_email + " | " + school_password)
        user = {
            'id': randomString(), #todo randomly generate a number/string or increment? or use mongo's built in
            'school_email': school_email,
            'school_password': school_password,
            'classes': []
        }
        print("inserting!")
        x = self.db.insert_one(user)
        print(x)
        #todo json response
        print("Done!")

    def update_grades_classes(self, user_id):
        #expects a list of 'class_grade' objects see below
        #TODO limit this to once a couple mins
        #TODO multithread?
        user = self.get_user(user_id)
        ps = PowerschoolScraper(user.school_email, user.school_password)
        ps.login()
        new_clsss = ps.get_all_class_grades()
        self.db.update_one({
        'id': user_id
        },{
        '$set': {
            'classes': new_clsss,
        }
        }, upsert=False)

    def get_all_users(self):
        all = list(self.db.find({}))
        ret_str = ''
        for user in all:
            ret_str += str(user) + '</br>'

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
    # todo checks / error handling here
    db.add_user(data['un'], data['ps'], data['se'], data['sp'])
    return '.'

@app.route('/api/<user_id>')
def get_user_from_id(user_id):
    print("hello")
    x =  db.get_user(user_id, asString=True)
    return x

@app.route('/api/get_all_users')
def get_all_users():
    return db.get_all_users()

@app.route('/api/<user_id>/update', methods = ['POST'])
def update_grades(user_id):
    return db.update_grades_classes(user_id)



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