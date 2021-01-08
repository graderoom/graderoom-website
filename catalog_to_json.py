import json, sys, re
from bs4 import BeautifulSoup as BS


with open("catalog.html", encoding="utf-8") as f:
    # with open the file, content becomes the reading of it
    content = f.read()
    soup = BS(content, 'html.parser')
    classes = soup.find_all('div', class_='card')

    objs = []

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
            obj['description'] = obj['description'].replace('\xa0', '').split('... Read More ')[1]
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

        

        objs.append(obj)

# output to file
with open("catalog.json", 'w') as f:
    json.dump(objs, f)