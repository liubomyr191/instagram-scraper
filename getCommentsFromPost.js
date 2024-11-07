
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCookiesFromLogin() {
    const browser = await puppeteer.launch({
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 60000 });

        const loginButton = await page.waitForSelector('a[href="/accounts/login/"]', { timeout: 10000 }).catch(() => null);

        if (loginButton) {
            await loginButton.click();
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
        }

        await page.waitForSelector('input[name="username"]', { timeout: 20000 });
        //  add instagram login here
        await page.type('input[name="username"]', 'WRITE YOUR USERNAME HERE', { delay: 100 });
        await page.type('input[name="password"]', 'WRITE YOUR PASSWORD HERE', { delay: 100 });
        await page.click('button[type="submit"]');

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

        console.log("Login successful!");

        const cookies = await page.cookies();
        await browser.close();
        const cookieObject = cookies.reduce((acc, { name, value }) => {
            acc[name] = value;
            return acc;
          }, {});
          
        console.log(cookieObject);
        
        return cookieObject;  

    } catch (error) {
        console.error("Error during login:", error);
        await browser.close();
        return null;
    }
}

async function getComments(params, cookies, headers, mediaId) {
    try {
        const response = await axios.get(`https://www.instagram.com/api/v1/media/${mediaId}/comments/`, {
            params: params,
            headers: {
                ...headers, 
                Cookie: Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; '),
            }
        });
        
        const data = response.data;
        const comments = data.comments.map(comment => comment.text);
        const nextMinId = data.next_min_id;
        
        return { comments, nextMinId };
    } catch (error) {
        console.error("Error fetching comments:", error);
        return { comments: [], nextMinId: null };
    }
}

async function saveCommentsToCSV(comments, fileName = "all_comment.csv") {
    const csvWriter = createCsvWriter({
        path: fileName,
        header: ["comments"],
        append: true
    });

    const records = comments.map(comment => [comment]);
    await csvWriter.writeRecords(records);
}

async function extractMediaId(postUrl, cookies, headers) {
    try {
        const response = await axios.get(postUrl, {
            headers: {
                ...headers, 
                Cookie: Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ')
            }
        });
        const html = response.data;
        
        const mediaIdMatch = html.match(/"media_id":"(\d+)"/);
        
        if (mediaIdMatch) {
            return mediaIdMatch[1];
        } else {
            throw new Error("Media ID not found in the post URL");
        }
    } catch (error) {
        console.error("Error extracting media ID:", error);
        return null;
    }
}

async function scrapeInstagramComments(postUrl, cookies, headers, initialParams) {
    const mediaId = await extractMediaId(postUrl, cookies, headers);
    if (!mediaId) {
        console.error("Failed to get media ID. Aborting.");
        return;
    }

    const params = { ...initialParams };
    const fileName = "all_comment.csv";

    fs.writeFileSync(fileName, "comments\n");

    let pageCount = 1;  
    while (true) {
        const { comments, nextMinId } = await getComments(params, cookies, headers, mediaId);
        if (!comments.length) break;

        await saveCommentsToCSV(comments, fileName);

        console.log(`Page ${pageCount} - Fetched ${comments.length} comments`);

        
        await sleep(2000 + Math.random() * 3000); 

        if (!nextMinId) break;

        params.min_id = nextMinId;
        pageCount++;
    }

    console.log("Scraping complete. Comments saved to", fileName);
}

async function main() {
    const cookies = await getCookiesFromLogin(); 
    if (!cookies) {
        console.error("Login failed. Exiting.");
        return;
    }

    const headers = {
        'accept': '*/*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'priority': 'u=1, i',
        'referer': 'https://www.instagram.com/p/DAGsp6splns/',
        'sec-ch-prefers-color-scheme': 'dark',
        'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'sec-ch-ua-full-version-list': '"Chromium";v="130.0.6723.92", "Google Chrome";v="130.0.6723.92", "Not?A_Brand";v="99.0.0.0"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-model': '""',
        'sec-ch-ua-platform': '"macOS"',
        'sec-ch-ua-platform-version': '"14.2.0"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'x-asbd-id': '129477',
        'x-csrftoken': 'x9Xp69nDePzvFiZYOBWtAjUxcuiLKIeE',
        'x-ig-app-id': '936619743392459',
        'x-ig-www-claim': 'hmac.AR34KcSrfTgkgG2H-CgBgo2ULencgwOs73GIGBSUrQuXD8bp',
        'x-requested-with': 'XMLHttpRequest',
    };

    const initialParams = {
        'can_support_threading': 'true',
        'sort_order': 'popular',
    };

    const postUrl = 'https://www.instagram.com/p/DBpLHWDzuAo/';
    await scrapeInstagramComments(postUrl, cookies, headers, initialParams);
}

main();
