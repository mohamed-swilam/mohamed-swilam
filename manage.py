#!/usr/bin/env python3
import json
import os
import subprocess
import shutil
from datetime import datetime

DATA_FILE = "assets/data/writeups.json"
WRITEUPS_DIR = "assets/writeups"

def load_data():
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

def add_writeup():
    print("\n--- 🆕 Add New Writeup ---")
    wid = input("ID (e.g., my-new-cve): ").strip().replace(' ', '-')
    if not wid:
        print("❌ ID cannot be empty.")
        return
        
    data = load_data()
    if any(w['id'] == wid for w in data):
        print("❌ Error: Writeup with this ID already exists.")
        return
        
    title = input("Title: ").strip()
    summary = input("Summary: ").strip()
    
    tags_in = input("Tags (comma separated, e.g., Web, XSS): ").strip()
    tags = [t.strip() for t in tags_in.split(',') if t.strip()]
    
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    # Create folder structure
    w_dir = os.path.join(WRITEUPS_DIR, wid)
    img_dir = os.path.join(w_dir, "images")
    md_file = os.path.join(w_dir, f"{wid}.md")
    
    os.makedirs(img_dir, exist_ok=True)
    
    # Create initial Markdown file
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(f"# {title}\n\n> **Date:** {date_str}\n> **Tags:** {', '.join(tags)}\n\n---\n\nWrite your content here...\n\n<!-- To add an image: ![Description](images/your-image.png) -->\n")
        
    # Append to JSON
    new_entry = {
        "id": wid,
        "title": title,
        "date": date_str,
        "tags": tags,
        "summary": summary,
        "file": f"{w_dir}/{wid}.md"
    }
    
    data.append(new_entry)
    save_data(data)
    
    print(f"\n✅ Created folder: {w_dir}/")
    print(f"✅ Created markdown: {md_file}")
    print(f"✅ Added to: {DATA_FILE}")

def delete_writeup():
    print("\n--- 🗑️ Delete Writeup ---")
    data = load_data()
    if not data:
        print("No writeups found.")
        return
        
    for i, w in enumerate(data):
        print(f"{i+1}. [{w['id']}] {w['title']}")
        
    try:
        idx = int(input("\nSelect writeup number to delete (0 to cancel): ")) - 1
        if idx == -1: return
        
        if 0 <= idx < len(data):
            w = data[idx]
            wid = w['id']
            w_dir = os.path.join(WRITEUPS_DIR, wid)
            
            confirm = input(f"⚠️ Are you SURE you want to delete '{wid}' and ALL its files? (y/N): ")
            if confirm.lower() == 'y':
                data.pop(idx) # Remove from JSON
                
                # Remove files
                if os.path.exists(w_dir):
                    shutil.rmtree(w_dir)
                    
                save_data(data)
                print(f"✅ Deleted writeup '{wid}' successfully.")
            else:
                print("Canceled.")
        else:
            print("❌ Invalid selection.")
    except ValueError:
        print("❌ Invalid input. Please enter a number.")

def edit_writeup():
    print("\n--- 📝 Edit Writeup Markdown ---")
    data = load_data()
    if not data:
        print("No writeups found.")
        return
        
    for i, w in enumerate(data):
        print(f"{i+1}. [{w['id']}] {w['title']}")
        
    try:
        idx = int(input("\nSelect writeup number to edit (0 to cancel): ")) - 1
        if idx == -1: return
        
        if 0 <= idx < len(data):
            wid = data[idx]['id']
            md_file = os.path.join(WRITEUPS_DIR, wid, f"{wid}.md")
            
            if os.path.exists(md_file):
                # Try to use VSCode if available, otherwise nano or default EDITOR
                editor = os.environ.get('EDITOR', 'nano')
                print(f"Opening {md_file} in your editor...")
                subprocess.call([editor, md_file])
            else:
                print(f"❌ Markdown file not found: {md_file}")
        else:
            print("❌ Invalid selection.")
    except ValueError:
        print("❌ Invalid input. Please enter a number.")

def main():
    while True:
        print("\n" + "="*40)
        print(" 🚀 Swilam's Portfolio - Writeup Manager ")
        print("="*40)
        print("1. 🆕 Add a new writeup")
        print("2. 📝 Edit a writeup (Markdown)")
        print("3. 🗑️ Delete a writeup")
        print("4. 🚪 Exit")
        
        choice = input("\nSelect option [1-4]: ").strip()
        
        if choice == '1':
            add_writeup()
        elif choice == '2':
            edit_writeup()
        elif choice == '3':
            delete_writeup()
        elif choice == '4':
            print("Bye! 👋")
            break
        else:
            print("❌ Invalid option.")

if __name__ == "__main__":
    main()
