import random, math
ARCH_EMOJI = {"Seeker":"🧭","Analyst":"🧠","Empath":"💙","Builder":"🧱","Anchor":"⚓","Visionary":"🌌","Mystic":"🔮","Narrator":"📖","Guardian":"🛡️","Rebel":"🔥"}
ARCH_LIST = list(ARCH_EMOJI.keys())

def pick_random_archetype():
    name = random.choice(ARCH_LIST)
    return {"name": name, "emoji": ARCH_EMOJI[name]}

def score_from_answers(answers):
    # lightweight: average value determines which centroid; expand as needed
    avg = sum(a.get("value",5) for a in answers)/max(1,len(answers))
    # map ranges to archetypes (placeholder mapping — replace with real centroids)
    idx = int((avg - 1)/(10/len(ARCH_LIST)))
    idx = max(0, min(len(ARCH_LIST)-1, idx))
    name = ARCH_LIST[idx]
    # produce distribution softmax-like
    dist = {k: 0.02 for k in ARCH_LIST}
    dist[name] = 0.9
    return {"distribution": dist, "dominant": name, "emoji": ARCH_EMOJI[name]}
