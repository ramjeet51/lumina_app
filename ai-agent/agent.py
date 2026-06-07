import time
import os
import requests
from openai import OpenAI

# 🔑 OPENAI CLIENT (Make sure env variable is set)
#client = OpenAI()
client = OpenAI(api_key="")
# 🔑 TELEGRAM CONFIG (⚠️ change token if exposed)
BOT_TOKEN = "8581642820:AAFbgfgys86Xp0vMlRUbyHIoDNByTcoKjWQ"
CHAT_ID = "8665712721"

# 📄 LOG FILE
LOG_FILE = "/home/ramjeet/.pm2/logs/lumina-backend-error.log"

# 📲 SEND TELEGRAM MESSAGE
def send_telegram(msg):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    try:
        requests.post(url, data={"chat_id": CHAT_ID, "text": msg})
        print("📲 Telegram alert sent")
    except Exception as e:
        print("❌ Telegram error:", e)

# 📄 READ LAST LOGS
def read_logs():
    try:
        with open(LOG_FILE, "r") as f:
            return f.readlines()[-20:]
    except:
        return []

# 🧠 AI ANALYSIS FUNCTION
def analyze_with_ai(log):
    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a senior DevOps engineer. Give short root cause and fix."
                },
                {
                    "role": "user",
                    "content": f"Analyze this log:\n{log}"
                }
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"AI error: {e}"

# 🔍 MAIN ANALYSIS LOGIC
def analyze_logs(log_text):
    log_lower = log_text.lower()

    # 🚨 PORT ISSUE
    if "address already in use" in log_lower:
        msg = "🚨 Port 8000 already in use! Fixing..."
        print(msg)
        send_telegram(msg)
        os.system("fuser -k 8000/tcp")
        os.system("pm2 restart lumina-backend")

    # 🚨 DATABASE ISSUE
    elif "database" in log_lower:
        ai_result = analyze_with_ai(log_text)
        msg = f"🚨 Database issue detected!\n\n🤖 AI Analysis:\n{ai_result}"
        print(msg)
        send_telegram(msg)

    # 🚨 GENERAL ERROR (SMART AI)
    elif "error" in log_lower or "aborted" in log_lower:
        print("🚨 Error detected")

        ai_result = analyze_with_ai(log_text)

        msg = f"🚨 Error Detected!\n\n🤖 AI Analysis:\n{ai_result}"
        print(msg)
        send_telegram(msg)

        # 🔄 AUTO HEAL
        os.system("pm2 restart lumina-backend")

    else:
        print("✅ System healthy")

# 🧠 SPAM CONTROL
last_alert_time = 0
last_log_text = ""

# 🔁 MAIN LOOP
while True:
    logs = read_logs()
    log_text = "".join(logs)

    print("\n🔍 Checking logs...")

    if log_text.strip():

        # ❌ SAME LOG SKIP
        if log_text == last_log_text:
            print("⏩ Same log, skipping...")
        else:
            last_log_text = log_text

            # ⏱️ COOLDOWN (5 min)
            if time.time() - last_alert_time > 300:
                analyze_logs(log_text)
                last_alert_time = time.time()
            else:
                print("⏳ Cooldown active, skipping alert...")

    time.sleep(30)
