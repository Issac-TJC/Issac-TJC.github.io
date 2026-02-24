import os
import json
import re
from datetime import datetime

# Adjust to project root if script is run from inside 'tool' folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(BASE_DIR, 'articles')
DATA_DIR = os.path.join(BASE_DIR, 'data')
POSTS_JSON = os.path.join(DATA_DIR, 'posts.json')

def get_frontmatter(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    match = re.match(r'^---\s*(.*?)\s*---', content, re.DOTALL)
    data = {}
    if match:
        meta_str = match.group(1)
        for line in meta_str.split('\n'):
            if ':' in line:
                key, val = line.split(':', 1)
                data[key.strip()] = val.strip().strip("'\"")
    return data

def build_index():
    if not os.path.exists(ARTICLES_DIR):
        print("Articles directory not found.")
        return

    posts = []
    # Using timestamp for fallback ID
    
    for filename in os.listdir(ARTICLES_DIR):
        if filename.endswith('.md'):
            filepath = os.path.join(ARTICLES_DIR, filename)
            meta = get_frontmatter(filepath)
            
            if not meta:
                continue

            post = {
                "id": int(meta.get("id", int(datetime.now().timestamp() * 1000) % 10000000)),
                "title": meta.get("title", 'Untitled'),
                "category": meta.get("category", 'Uncategorized'),
                "date": meta.get("date", datetime.now().strftime('%Y-%m-%d')),
                "desc": meta.get("desc", 'No description'),
                "image": meta.get("image", ''),
                "file": f"articles/{filename}",
                "link": meta.get("link", '#')
            }
            posts.append(post)

    # Sort descending by date
    posts.sort(key=lambda x: x['date'], reverse=True)

    with open(POSTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Successfully built {len(posts)} articles into data/posts.json")

def create_article():
    title = input("Enter article title: ")
    category = input("Enter category (e.g. 随笔, 技术): ")
    desc = input("Enter short description: ")
    image = input("Enter cover image URL (leave blank if none): ")
    filename = input("Enter filename (without .md, e.g. my-first-post): ")
    
    if not filename:
        filename = f"post-{int(datetime.now().timestamp())}"
    
    filepath = os.path.join(ARTICLES_DIR, f"{filename}.md")
    
    if os.path.exists(filepath):
        print("File already exists!")
        return

    date_str = datetime.now().strftime('%Y-%m-%d')
    post_id = int(datetime.now().timestamp() * 1000) % 10000000

    template = f"""---
id: {post_id}
title: {title}
category: {category}
date: {date_str}
desc: {desc}
image: {image}
link: #
---

# {title}

在此处开始写作...
"""
    if not os.path.exists(ARTICLES_DIR):
        os.makedirs(ARTICLES_DIR)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(template)
        
    print(f"✅ Created article: {filepath}")
    
    # Auto rebuild
    print("Rebuilding index automatically...")
    build_index()

def main():
    while True:
        print("\n=== Blog Manager ===")
        print("1. Create new article")
        print("2. Rebuild existing index (posts.json)")
        print("3. Exit")
        choice = input("Select an option: ")
        
        if choice == '1':
            create_article()
        elif choice == '2':
            build_index()
        elif choice == '3':
            break
        else:
            print("Invalid option.")

if __name__ == "__main__":
    main()
