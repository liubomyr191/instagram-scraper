import requests
import csv
import re

def extract_media_id(post_url, headers):
    response = requests.get(post_url, headers=headers)
    match = re.search(r'"media_id":"(\d+)"', response.text)
    if match:
        return match.group(1)
    else:
        print("Could not extract media ID. Please check the post URL.")
        return None

def get_comments(media_id, params, cookies, headers):
    response = requests.get(
        f'https://www.instagram.com/api/v1/media/{media_id}/comments/',
        params=params,
        cookies=cookies,
        headers=headers
    )
    data = response.json()
    comments = [comment.get("text") for comment in data.get("comments", [])]
    next_min_id = data.get("next_min_id")
    return comments, next_min_id

def save_comments_to_csv(comments, file_name="all_comment.csv"):
    with open(file_name, "a", newline='', encoding="utf-8") as file:
        csv_writer = csv.writer(file)
        for comment in comments:
            csv_writer.writerow([comment])

def scrape_instagram_comments(post_url, cookies, headers, initial_params):
    media_id = extract_media_id(post_url, headers)
    if not media_id:
        return

    params = initial_params.copy()
    with open("all_comment.csv", "w", newline='') as file:
        csv_writer = csv.writer(file)
        csv_writer.writerow(["comments"])  

    while True:
        comments, next_min_id = get_comments(media_id, params, cookies, headers)
        if not comments:
            break
        save_comments_to_csv(comments)
        if not next_min_id:
            break
        params['min_id'] = next_min_id


cookies = {
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
}

headers = {
    'accept': '*/*',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://www.instagram.com/',
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
}

initial_params = {
    'can_support_threading': 'true',
    'sort_order': 'popular',
}

# Input the Instagram post URL here
post_url = "https://www.instagram.com/p/DBvAUSANpWs/?"


scrape_instagram_comments(post_url, cookies, headers, initial_params)
