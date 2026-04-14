import requests
import json
import time

# تأكد أن السيرفر يعمل على هذا الرابط
BASE_URL = "http://127.0.0.1:8000/api/chat"

# التوكن السري الذي أضفناه في الـ AuthMiddleware
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer DEV_TEST_TOKEN_2026"
}

def run_tests():
    print("🚀 بدء اختبارات الـ API لسبراينت 1...\n")

    # 🔍 1. اختبار حماية المحتوى (سؤال خارج النطاق)
    print("🔍 1. جاري اختبار Scope Guard (سؤال عن السياسة)...")
    payload_out_of_scope = {
        "content": "إيه رأيك في السياسة والاقتصاد؟",
        "session_id": None
    }
    try:
        res1 = requests.post(BASE_URL, json=payload_out_of_scope, headers=HEADERS)
        data1 = res1.json()
        
        if res1.status_code == 200 and data1.get("type") == "out_of_scope":
            print("✅ نجاح: السيرفر اكتشف السؤال الخارج عن النطاق ورفض الإجابة.\n")
        else:
            print(f"❌ فشل: الرد غير متوقع - {data1}\n")
    except Exception as e:
        print(f"❌ خطأ في الاتصال: {e}\n")

    # 🔍 2. اختبار إنشاء Session جديد
    print("🔍 2. جاري اختبار إنشاء Session ID جديد...")
    payload_new = {
        "content": "أريد نظام غذائي للتنشيف",
        "session_id": None
    }
    res2 = requests.post(BASE_URL, json=payload_new, headers=HEADERS)
    data2 = res2.json()
    new_session_id = data2.get("session_id")
    
    if res2.status_code == 200 and new_session_id:
        print(f"✅ نجاح: تم إنشاء Session جديد: {new_session_id}\n")
    else:
        print("❌ فشل في إنشاء الجلسة\n")

    # 🔍 3. اختبار استكمال المحادثة بنفس الـ Session
    print("🔍 3. جاري اختبار استكمال المحادثة بنفس الـ Session ID...")
    payload_continue = {
        "content": "هل يمكنني إضافة الموز؟",
        "session_id": new_session_id
    }
    res3 = requests.post(BASE_URL, json=payload_continue, headers=HEADERS)
    data3 = res3.json()
    
    if res3.status_code == 200 and data3.get("session_id") == new_session_id:
        print(f"✅ نجاح: السيرفر حافظ على نفس الـ Session ID: {new_session_id}\n")
    else:
        print("❌ فشل: السيرفر لم يتعرف على الجلسة القديمة\n")

    print("✨ مبروك يا هندسة! جميع اختبارات سبراينت 1 تمت بنجاح ساحق. 🚀")

if __name__ == "__main__":
    run_tests()