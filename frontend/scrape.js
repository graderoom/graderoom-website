let axios = require('axios').default;
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
let JSSoup = require('jssoup').default;
const qs = require('querystring');

const fs = require('fs'); //todo remove

axiosCookieJarSupport(axios);
let cookieJar = new tough.CookieJar();


module.exports = {

    loginAndScrapeGrades: async function(email, password) {
        //TODO return {success: true, message: "Done!"} etc
        //Authenticates via SAML; see https://developers.onelogin.com/saml

        //for logging in
        let headers_1 = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Host': 'federation.bcp.org',
            'Origin': 'https://federation.bcp.org',
            'Referer': 'https://federation.bcp.org/idp/SSO.saml2',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'
        };

        //for logging in part 2
        let headers_2 = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Host': 'federation.bcp.org',
            'Origin': 'https://powerschool.bcp.org',
            'Referer': 'https://powerschool.bcp.org/guardian/home.html',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'
        };

        // for logging in part 3
        let headers_3 = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Host': 'powerschool.bcp.org',
            'Origin': 'https://federation.bcp.org',
            'Referer': 'CHANGE_THIS',  // change to the dynamic url
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'

        };
        //for logging in part 4
        let sso_ping_no_two_headers = {

            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Host': 'federation.bcp.org',
            'Origin': 'https://federation.bcp.org',
            'Referer': 'https://federation.bcp.org/idp/SSO.saml2',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'
        };


        let saml1;
        // let cookies = [];
        let url = "https://powerschool.bcp.org/guardian/home.html"; // get a cookie and intial saml request token
        try {

            let options_1 = {
                url: url,
                headers: headers_1,
                jar: cookieJar,
            };
            let r1 = await axios.get(url, {
                jar: cookieJar,
                headers: headers_1,
                withCredentials: true
            });

            // let jSeshCookie = (r.headers['set-cookie'][0]).split(';')[0];
            // cookies.push(jSeshCookie);
            // console.log("Added JSESSION cookie.");

            let soup = new JSSoup(r1.data);
            saml1 = soup.find('input', {'name': 'SAMLRequest'}).attrs.value;
            console.log("Found first SAMLRequest: " + saml1);

        } catch (err) {
            console.error("error scraping level 1: " + err);
            return;
        }

        let url2 = 'https://federation.bcp.org/idp/SSO.saml2';
        let post_data_1 = {
            'RelayState': "/guardian/home.html",
            'SAMLRequest': saml1,
        };

        let actionFullUrl;

        try {
            let r2 = await axios.post(url2, qs.stringify(post_data_1), {
                headers: headers_2,
                jar: cookieJar,
                withCredentials: true
            });

            // let pfCookie = (r2.headers['set-cookie'][0]).split(';')[0];
            // cookies.push(pfCookie);
            // console.log("Added PF cookie.");

            let soup2 = new JSSoup(r2.data);
            let formTag = soup2.find('form');
            let actionHalfUrl = formTag.attrs.action;
            actionFullUrl = 'https://federation.bcp.org' + actionHalfUrl;
            console.log("Found login url: " + actionFullUrl);

        } catch (err) {
            console.error("error scraping level 2: " + err);
            return;
        }

        //continue

        //add cookie manually
        // let cookieString = cookies.join('; ') + ';';
        // console.log(cookieString);
        // sso_ping_no_two_headers['Cookie'] = cookieString;
        let samlResponse;
        try {

            let post_data_2 = {
                'pf.ok': '',
                'pf.cancel': '',
                'pf.username': email,
                'pf.pass': password,
            };

            let r3 = await axios.post(actionFullUrl, qs.stringify(post_data_2), {
                headers: sso_ping_no_two_headers,
                jar: cookieJar,
                withCredentials: true
            });

            // console.log(r3);
            let soup3 = new JSSoup(r3.data);
            samlResponse = soup3.find('input', {'name': 'SAMLResponse'}).attrs.value;
            //undefined checks/etc
            console.log("SAML Response:" + samlResponse);
            //replace PF cookie with new one:
            // console.log(r3.headers['set-cookie']);
            // let newPFCookie = (r3.headers['set-cookie'][0]).split(';')[0];
            // cookies[1] = newPFCookie; //todo ?
            // console.log("Added PF cookie.");
            // console.log(cookies);

        } catch (err) {
            console.error("error scraping level 3");
            return;
        }


        let initialPowerSchoolPageHTML;
        try {

            //continue
            let url4 = 'https://powerschool.bcp.org:443/saml/SSO/alias/pslive';
            let post_data_3 = {
                'SAMLResponse': samlResponse,
                'RelayState': "/guardian/home.html",
            };
            headers_3['Referer'] = actionFullUrl;
            // let jSeshCookie = cookieJar.getCookieString('powerschool.bcp.org');
            // console.log(jSeshCookie);
            // headers_3['Cookie'] = jSeshCookie; //TODO
            let r4 = await axios.post(url4, qs.stringify(post_data_3), {
                headers: headers_3,
                jar: cookieJar,
                withCredentials: true
            });
            // console.log(r4);
            initialPowerSchoolPageHTML = r4.data;
            // console.log(r4.data);
            //scrape grades from here

        } catch (err) {
            console.error("error scraping level 4");
            return;
        }

        try {

            let soupP1 = new JSSoup(initialPowerSchoolPageHTML);
            // console.log(initialPowerSchoolPageHTML);
            // fs.writeFile("test.html", initialPowerSchoolPageHTML,  function(err) {
            //
            //     if(err) {
            //         return console.log(err);
            //     }
            //
            //     console.log("The file was saved!");
            // });
            let table = soupP1.find('table', 'linkDescList');
            // console.log(table);

            // console.log(soupP1.toString());

            let maybeTableRows = table.find('tr');

            console.log(maybeTableRows.text);
            return;
            let actualGradeRows = [];

            for (let testRow in maybeTableRows) {
                console.log(testRow.attrs);
                // console.log(testRow)
                if (testRow['class'] &&  testRow['class'] === ['center']) {
                    actualGradeRows.push(testRow);
                }
            }


            console.log(actualGradeRows);


        } catch (err) {
            console.error("Error parsing html")
            console.error(err)
        }


    },

};

