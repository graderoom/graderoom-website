import asyncio
import re
from bs4 import BeautifulSoup as BS
from pymongo import MongoClient
import requests
from requests.structures import CaseInsensitiveDict

session = requests.Session()

headers = CaseInsensitiveDict()
headers["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36 Edg/97.0.1072.55"
resp = session.get("https://b.bcp.org/catalog/home/index", headers=headers)
soup = BS(resp.text, 'html.parser')
data = soup.find('form', id='vars').find_all('input')
csrf = data[0]['value']
cookie = resp.headers['Set-Cookie']
cookie = cookie.split(';')[0]

headers = CaseInsensitiveDict()
headers["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36 Edg/97.0.1072.55"
headers["content-type"] = "application/x-www-form-urlencoded; charset=UTF-8"
headers["x-requested-with"] = "XMLHttpRequest"
headers["cookie"] = cookie

data = "s=&form=getCatalog&csrf=" + csrf + "&page=1&chunk=200"

resp = requests.post("https://b.bcp.org/catalog/home/ajax", headers=headers, data=data)

content = resp.json()['success']['html']

with open('catalog.html', 'w') as f:
    f.write(content)

soup = BS(content, 'html.parser')
classes = soup.find_all('div', class_='card')

url = "mongodb://localhost:27017"  # TODO change this for prod
database_name = "common"
collection_name = "catalog"
client = MongoClient(url)
db = client[database_name][collection_name]

print(len(classes))
for class_ in classes:
    # get divs with the data
    data = class_.find('div', class_='box').find_all('div', recursive=False)

    obj = {}

    # get the main stuff
    obj['class_name'] = data[0].text.strip()
    obj['department'] = data[1].text.strip()
    obj['grade_levels'] = data[2].text.strip()
    obj['credits'] = int(float(data[3].text.strip()[9:]))
    obj['terms'] = int(data[4].text.strip()[7:])
    obj['description'] = data[5].text.strip()

    obj['uc_csuClassType'] = ''
    obj['classType'] = 'none'

    # cut the duplicated text from the description
    try:
        obj['description'] = obj['description'].replace('\xa0', '').split('Course Content: ')[2]
    except:
        # case for when the description section is dumb and doesn't have content
        obj['description'] = '*'

    # uc/csu/honors/ap detection shit
    desc = obj['description']

    if 'AP' in obj['class_name']:
        obj['uc_csuClassType'] = 'uc_ap'
        obj['classType'] = 'ap'
    elif '*' not in desc:
        pass
    elif 'not given honors' in desc.lower().split('*')[1]:
        obj['uc_csuClassType'] = 'uc'
        obj['classType'] = 'honors'
    elif 'honors' in desc.lower().split('*')[1] or 'Honors' in obj['class_name']:
        obj['uc_csuClassType'] = 'uc_hon'
        obj['classType'] = 'honors'
    elif 'not' == desc.lower().split('*')[1][:3]:
        pass
    else:
        obj['uc_csuClassType'] = 'uc'

    if obj['department'] == 'Fitness and Health':
        obj['classType'] = 'non-academic'

    # clean up some parts of the data
    obj['grade_levels'] = re.findall('[0-9]+', obj['grade_levels'])
    obj['grade_levels'] = [int(i) for i in obj['grade_levels']]


    db.update_one({'class_name': obj['class_name']}, {'$set': obj}, True)

client.close()
