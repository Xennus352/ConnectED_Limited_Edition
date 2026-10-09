#!/usr/bin/env python3
"""Replace the fleet translation block in en/mm with the full, friendly key set.
Serialises exactly like the hand-maintained files (ensure_ascii, indent=2)."""
import json

EN_FLEET = {
    "liveFleet": "Active Fleet",
    "childrenBuses": "Your Child's Bus",
    "busesEnRoute": "Buses En Route",
    "busesOnRoute": "Buses On Route",
    "noBuses": "No Buses En Route",
    "oneBus": "1 Bus En Route",
    "updatedAgo": "Updated {age} ago",
    "justNow": "Just now",
    "minutesAgo": "{count} minutes ago",
    "oneMinute": "1 minute ago",
    "hoursAgo": "{count} hours ago",
    "oneHour": "1 hour ago",
    "daysAgo": "{count} days ago",
    "oneDay": "1 day ago",
    "headerTitle": "Live Bus Tracker",
    "headerSubtitle": "Follow your children's buses in real time.",
    "statusLive": "\u2022 LIVE",
    "statusUpdating": "Updating",
    "statusStale": "Last known location",
    "statusOffline": "Offline",
    "statusNoLocation": "Location unavailable",
    "enRoute": "En Route",
    "noLocation": "No location",
    "stats": {
        "total": "Total",
        "running": "Running",
        "idle": "Idle",
        "stopped": "Stopped",
        "offline": "Offline",
        "live": "Live",
    },
    "noActiveBuses": "No active buses",
    "liveBuses": "Live Buses",
    "heading": "Heading",
    "speed": "Speed",
    "lastUpdate": "Last update",
    "errorLoading": "Failed to load fleet data",
    "loadingFleet": "Loading live buses\u2026",
    "noActiveTrips": "No active trips",
    "panel": {
        "search": "Search buses\u2026",
        "no_route": "No route assigned",
        "riders": "{count} riders",
    },
    "empty": {
        "no_buses": "No buses on the map",
        "no_buses_hint": "Vehicles appear here the moment they report their GPS position.",
        "no_matches": "No buses match your search",
    },
    "connection": {
        "lost": "Live connection lost \u2014 showing last known positions",
    },
    "action": {
        "follow": "Follow",
        "follow_bus": "Follow {bus}",
        "follow_bus_generic": "Follow selected bus",
        "resume_following": "Resume following",
        "stop_following": "Stop following",
        "retry": "Retry",
    },
    "errors": {
        "forbidden": "You don't have permission to view fleet data",
        "snapshot": "Couldn't load the live map",
    },
    "freshness": {
        "live": "Live",
        "delayed": "Delayed",
        "stale": "Stale",
        "offline": "Offline",
    },
    "stop": {
        "arrival": "Arrives in {minutes} min",
        "riders": "{count} riders",
    },
}

MM_FLEET = {
    "liveFleet": "တိုက်ရိုက် ယာဉ်စီးရေး",
    "childrenBuses": "သင့်ကလေးများ၏ ဘတ်စ်ကား",
    "busesEnRoute": "လမ်းပေါ်ရှိ ဘတ်စ်ကားများ",
    "busesOnRoute": "လမ်းကြောင်းပေါ် ဘတ်စ်ကားများ",
    "noBuses": "ဘတ်စ်ကား မရှိပါ",
    "oneBus": "ဘတ်စ်ကား ၁ စီး သွားနေသည်",
    "updatedAgo": "{age} ကတည်းက အပ်ဒိတ် ပြုလုပ်ထားသည်",
    "justNow": "ယခုလေးတင်",
    "minutesAgo": "{count} မိနစ်က",
    "oneMinute": "၁ မိနစ်က",
    "hoursAgo": "{count} နာရီက",
    "oneHour": "၁ နာရီက",
    "daysAgo": "{count} ရက်က",
    "oneDay": "၁ ရက်က",
    "headerTitle": "တိုက်ရိုက် ဘတ်စ်ကား ခြေရာခံ",
    "headerSubtitle": "သင့်ကလေးများ၏ ဘတ်စ်ကားများကို အချိန်နှင့်တပြေးညီ လိုက်ကြည့်နိုင်ပါသည်။",
    "statusLive": "• တိုက်ရိုက်",
    "statusUpdating": "အပ်ဒိတ် လုပ်နေသည်",
    "statusStale": "နောက်ဆုံး သိရှိသည့် နေရာ",
    "statusOffline": "အော့ဖ်လိုင်း",
    "statusNoLocation": "တည်နေရာ မရရှိပါ",
    "enRoute": "လမ်းပေါ် သွားနေသည်",
    "noLocation": "တည်နေရာ မရှိ",
    "stats": {
        "total": "စုစုပေါင်း",
        "running": "သွားနေသည်",
        "idle": "စောင့်ဆိုင်း",
        "stopped": "ရပ်နားထား",
        "offline": "အော့ဖ်လိုင်း",
        "live": "တိုက်ရိုက်",
    },
    "noActiveBuses": "ပြေးနေသော ဘတ်စ်ကား မရှိပါ",
    "liveBuses": "တိုက်ရိုက် ဘတ်စ်ကားများ",
    "heading": "ဦးတည်ချက်",
    "speed": "မြန်နှုန်း",
    "lastUpdate": "နောက်ဆုံး အပ်ဒိတ်",
    "errorLoading": "ယာဉ်စီးရေး အချက်အလက်ကို ဖွင့်၍ မရပါ",
    "loadingFleet": "တိုက်ရိုက် ဘတ်စ်ကားများ ဖွင့်နေသည်…",
    "noActiveTrips": "ပြေးနေသော ခရီးစဉ် မရှိပါ",
    "panel": {
        "search": "ဘတ်စ်ကား ရှာရန်…",
        "no_route": "လမ်းကြောင်း မသတ်မှတ်ရသေးပါ",
        "riders": "ခရီးသည် {count} ဦး",
    },
    "empty": {
        "no_buses": "မြေပုံပေါ်တွင် ဘတ်စ်ကား မရှိပါ",
        "no_buses_hint": "ယာဉ်များက GPS တည်နေရာ ပို့သည်နှင့် ဤနေရာတွင် ပေါ်လာပါမည်။",
        "no_matches": "ရှာဖွေမှုနှင့် ကိုက်ညီသော ဘတ်စ်ကား မရှိပါ",
    },
    "connection": {
        "lost": "တိုက်ရိုက် ချိတ်ဆက်မှု ပျက်သွားသည် — နောက်ဆုံး သိရသည့် နေရာများကို ပြသထားသည်",
    },
    "action": {
        "follow": "လိုက်ကြည့်ရန်",
        "follow_bus": "{bus} ကို လိုက်ကြည့်ရန်",
        "follow_bus_generic": "ရွေးချယ်ထားသော ဘတ်စ်ကားကို လိုက်ကြည့်ရန်",
        "resume_following": "ဆက်လက် လိုက်ကြည့်ရန်",
        "stop_following": "လိုက်ကြည့်ခြင်း ရပ်ရန်",
        "retry": "ထပ်စမ်းကြည့်ရန်",
    },
    "errors": {
        "forbidden": "ယာဉ်စီးရေး အချက်အလက် ကြည့်ရှုခွင့် မရှိပါ",
        "snapshot": "တိုက်ရိုက် မြေပုံကို ဖွင့်၍ မရပါ",
    },
    "freshness": {
        "live": "တိုက်ရိုက်",
        "delayed": "နှောင့်နှေးနေသည်",
        "stale": "ဟောင်းနေပြီ",
        "offline": "အော့ဖ်လိုင်း",
    },
    "stop": {
        "arrival": "{minutes} မိနစ်အတွင်း ရောက်မည်",
        "riders": "ခရီးသည် {count} ဦး",
    },
}

for path, fleet in [
    ("public/locale/en/translation.json", EN_FLEET),
    ("public/locale/mm/translation.json", MM_FLEET),
]:
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    data["fleet"] = fleet
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=True, indent=2)
        fh.write("\n")
    print(f"updated {path}")