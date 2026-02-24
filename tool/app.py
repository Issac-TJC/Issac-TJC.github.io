import os
import json
import re
import yaml
from datetime import datetime
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(BASE_DIR, 'articles')
DATA_DIR = os.path.join(BASE_DIR, 'data')
POSTS_JSON = os.path.join(DATA_DIR, 'posts.json')

def ensure_dirs():
    os.makedirs(ARTICLES_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)

def parse_markdown(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        match = re.match(r'^---\s*(.*?)\s*---(.*)', content, re.DOTALL)
        if match:
            meta_str = match.group(1)
            body = match.group(2).strip()
            # Try parsing frontmatter as YAML
            try:
                meta = yaml.safe_load(meta_str)
            except yaml.YAMLError:
                # Fallback to simple line-based splitting
                meta = {}
                for line in meta_str.split('\n'):
                    if ':' in line:
                        k, v = line.split(':', 1)
                        meta[k.strip()] = v.strip().strip("'\"")
            
            # Ensure basic fields exist
            return {
                "id": str(meta.get("id", '')),
                "title": meta.get("title", "Untitled"),
                "category": meta.get("category", "Uncategorized"),
                "date": str(meta.get("date", "")).split()[0] if meta.get("date") else "", # Handle datetime objects from yaml
                "desc": meta.get("desc", ""),
                "image": meta.get("image", ""),
                "link": meta.get("link", "#"),
                "content": body,
                "filename": os.path.basename(filepath)
            }
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
    return None

def build_index_internal():
    posts = []
    
    for filename in os.listdir(ARTICLES_DIR):
        if filename.endswith('.md'):
            filepath = os.path.join(ARTICLES_DIR, filename)
            data = parse_markdown(filepath)
            if data:
                # Build concise post object for index
                post = {
                    "id": int(data["id"]) if str(data["id"]).isdigit() else int(datetime.now().timestamp() * 1000) % 10000000,
                    "title": data["title"],
                    "category": data["category"],
                    "date": data["date"] or datetime.now().strftime('%Y-%m-%d'),
                    "desc": data["desc"],
                    "image": data["image"],
                    "file": f"articles/{filename}",
                    "link": data["link"]
                }
                posts.append(post)

    # Sort descending by date
    posts.sort(key=lambda x: x['date'], reverse=True)

    with open(POSTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
    return posts

def generate_markdown(data):
    # Sanitize YAML strings
    title = str(data.get('title', 'Untitled')).replace('"', '\\"')
    desc = str(data.get('desc', '')).replace('"', '\\"')
    
    frontmatter = f"""---
id: {data.get('id')}
title: "{title}"
category: "{data.get('category', 'Uncategorized')}"
date: {data.get('date', datetime.now().strftime('%Y-%m-%d'))}
desc: "{desc}"
image: "{data.get('image', '')}"
link: "{data.get('link', '#')}"
---

{data.get('content', '')}
"""
    return frontmatter

# --- Routes ---

@app.route('/')
def index():
    ensure_dirs()
    return render_template('index.html')

@app.route('/api/articles', methods=['GET'])
def get_articles():
    articles = []
    if os.path.exists(ARTICLES_DIR):
        for filename in os.listdir(ARTICLES_DIR):
            if filename.endswith('.md'):
                data = parse_markdown(os.path.join(ARTICLES_DIR, filename))
                if data:
                    articles.append(data)
                    
    # Sort by date descending
    articles.sort(key=lambda x: x['date'], reverse=True)
    return jsonify(articles)

@app.route('/api/articles/<filename>', methods=['GET'])
def get_article(filename):
    filepath = os.path.join(ARTICLES_DIR, filename)
    if os.path.exists(filepath):
        data = parse_markdown(filepath)
        if data:
            return jsonify(data)
    return jsonify({"error": "Not found"}), 404

@app.route('/api/articles', methods=['POST'])
def save_article():
    data = request.json
    is_new = data.get('isNew', False)
    filename = data.get('filename')
    
    if not filename:
        # Generate safe filename from title or timestamp
        safe_title = re.sub(r'[^a-zA-Z0-9\u4e00-\u9fa5]', '-', data.get('title', 'post'))
        filename = f"{safe_title}-{int(datetime.now().timestamp())}.md"
    elif not filename.endswith('.md'):
        filename += '.md'
        
    filepath = os.path.join(ARTICLES_DIR, filename)
    
    # Generate new ID if needed
    if not data.get('id'):
        data['id'] = int(datetime.now().timestamp() * 1000) % 10000000
        
    # Set current date if missing
    if not data.get('date'):
        data['date'] = datetime.now().strftime('%Y-%m-%d')
        
    content_to_write = generate_markdown(data)
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content_to_write)
            
        # If renaming (original_filename provided), delete the old one
        original_filename = data.get('originalFilename')
        if original_filename and original_filename != filename:
            old_filepath = os.path.join(ARTICLES_DIR, original_filename)
            if os.path.exists(old_filepath):
                os.remove(old_filepath)
                
        # Rebuild index automatically
        build_index_internal()
        
        return jsonify({"success": True, "filename": filename, "message": "Article saved successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/articles/<filename>', methods=['DELETE'])
def delete_article(filename):
    filepath = os.path.join(ARTICLES_DIR, filename)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            build_index_internal()
            return jsonify({"success": True, "message": "Article deleted!"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Not found"}), 404

@app.route('/api/rebuild', methods=['POST'])
def rebuild_index():
    try:
        posts = build_index_internal()
        return jsonify({"success": True, "count": len(posts), "message": "Index rebuilt successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    ensure_dirs()
    print("🚀 Starting Visual Blog Manager...")
    print("👉 Open http://localhost:5000 in your browser")
    app.run(debug=True, port=5000)
