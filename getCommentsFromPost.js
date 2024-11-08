const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;

async function fetchInstagramCookies() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="username"]');
    // enter the instagram login
    await page.type('input[name="username"]', 'ENTER USERNAME', { delay: 50 });
    await page.type('input[name="password"]', 'ENTER PASSWORD', { delay: 50 });

    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    const cookiesArray = await page.cookies();
    const cookies = {};
    cookiesArray.forEach(cookie => {
        cookies[cookie.name] = cookie.value;
    });

    await browser.close();
    return cookies;
}


async function getComments(params, cookies, headers, mediaId) {
    try {
        const response = await axios.get(`https://www.instagram.com/api/v1/media/${mediaId}/comments/`, {
            params: params,
            headers: {
                ...headers,
                Cookie: Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ')
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

async function scrapeInstagramComments(cookies, headers, initialParams, mediaId) {
    const params = { ...initialParams };
    const fileName = "all_comment.csv";
    
    fs.writeFileSync(fileName, "comments\n");

    while (true) {
        const { comments, nextMinId } = await getComments(params, cookies, headers, mediaId);
        if (!comments.length) break;

        await saveCommentsToCSV(comments);
        if (!nextMinId) break;

        params.min_id = nextMinId;
    }

    console.log("Scraping complete. Comments saved to", fileName);
}

const getMediaIdFromLink = async (link) => {
    try {
        const response = await axios.get(link);
        const html = response.data;
        
        const mediaIdMatch = html.match(/"media_id":"(\d+)"/);
        if (mediaIdMatch && mediaIdMatch[1]) {
            return mediaIdMatch[1];
        } else {
            throw new Error("Media ID not found in link.");
        }
    } catch (error) {
        console.error("Error fetching media ID from link:", error);
        return null;
    }
};


async function runScraper() {
    const cookies = await fetchInstagramCookies(); 

    const headers = {
        
        'accept': '*/*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'priority': 'u=1, i',
        'referer': 'https://www.instagram.com/reel/DBuH0Yth_-N/?',
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

    // Instagram post URL 
    const postLink = 'https://www.instagram.com/p/DCG1ZTaNr0m/';  

   
    const mediaId = await getMediaIdFromLink(postLink);
    if (!mediaId) {
        console.error("Media ID could not be retrieved from the link.");
        return;
    }
    
    await scrapeInstagramComments(cookies, headers, initialParams, mediaId);
}
runScraper();
