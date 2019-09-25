from flask import Flask
from flask import request   
from tinydb import TinyDB, Query
from scrape import PowerschoolScraper
import string
import random

def randomString(stringLength=10):
    """Generate a random string of fixed length """
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(stringLength))

class DBHandler:

    def __init__(self):
            actual = TinyDB('./grades_db.json')
            self.db = actual.table('users')

    def get_user(self, user_id):
        q = Query()
        usr = self.db.search(q.id == user_id)[0] #this should not return more than 1 element bc of unique ids
        return usr

    def add_user(self, username, password, school_email, school_password): #todo do we want to handle user auth here?
        # print(username + " | " + password + " | " + school_email + " | " + school_password)
        user = {
            'id': randomString(), #todo randomly generate a number/string or increment? 
            #TODO check if id already exists? / switch to username system??
            'school_email': school_email,
            'school_password': school_password,
        }
        self.db.insert(user) #error handling?
        #todo json response
        return 'success'

    def update_grades_classes(self, user_id):
        #expects a list of 'class_grade' objects see below
        #TODO limit this to once a couple mins
        #TODO multithread?
        user = self.get_user(user_id)
        print(user)
        ps = PowerschoolScraper(user['school_email'], user['school_password'])
        ps.login()
        new_clsss = ps.get_all_class_grades()
        q = Query()
        self.db.update({'grades': new_clsss}, q.id == user_id)
        return 'status'

    def get_all_users(self):
        all = self.db
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
    usr = db.get_user(user_id)
    return str(usr)

@app.route('/api/get_all_users')
def get_all_users():
    return db.get_all_users()

@app.route('/api/<user_id>/update', methods = ['POST'])
def update_grades(user_id):
    return db.update_grades_classes(user_id)

# app.route('/alpha/<user_id>/graph')


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