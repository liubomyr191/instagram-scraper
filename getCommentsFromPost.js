const axios = require('axios');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;

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
    while (true) {
        const { comments, nextMinId } = await getComments(params, cookies, headers, mediaId);
        if (!comments.length) break;

        await saveCommentsToCSV(comments, fileName);
        if (!nextMinId) break;

        params.min_id = nextMinId; 
    }

    console.log("Scraping complete. Comments saved to", fileName);
}

const cookies = {
    'ig_did': '1BA5CE2C-424B-4709-A9A2-6E751C9A9B0B',
    'datr': 'Us2VZUu1FToDl875PXqHRZjG',
    'ps_n': '1',
    'ps_l': '1',
    'mid': 'ZpgssAAEAAGaLteqy6ldNJ03K5QG',
    'ig_nrcb': '1',
    'ds_user_id': '69564759697',
    'csrftoken': 'x9Xp69nDePzvFiZYOBWtAjUxcuiLKIeE',
    'sessionid': '69564759697%3A3Qd4nhZkZZKhIW%3A3%3AAYc-YntovGQPu63XugQDAfMhEv2LQB1dtRPvubOndw',
    'wd': '842x778',
    'rur': '"LDC\\05469564759697\\0541762265599:01f74c52eec886189544b92a96d51355b1c6890bbef08d3a24aa747e8c7336c2f1e96114"',
};

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

// input the Instagram post URL here
const postUrl = 'https://www.instagram.com/p/DB2V557SHk4/';
scrapeInstagramComments(postUrl, cookies, headers, initialParams);


