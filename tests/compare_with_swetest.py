#!/usr/bin/env python3
"""Compares AstroCore against the official swetest tool on random charts.
Usage: compare_with_swetest.py <astrotest-binary> <swetest-binary> <ephe-dir>"""
import json, random, subprocess, sys
astro, swetest, ephe = sys.argv[1:4]
random.seed(7)
bodies = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","trueNode","meanLilith","chiron"]
plist = "0123456789tAD"
systems = "PKORCAWBXMTUY"
worst_body = worst_house = 0.0
def angdiff(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)
N = 300
for i in range(N):
    jd = random.uniform(2378496.5, 2597641.5)  # 1800..2399
    lat = random.uniform(-60, 60); lon = random.uniform(-180, 180)
    hs = random.choice(systems)
    req = {"time": {"jdUt": jd}, "location": {"lat": lat, "lon": lon},
           "houseSystem": hs, "bodies": bodies}
    out = subprocess.run([astro, ephe, json.dumps(req)], capture_output=True, text=True).stdout
    res = json.loads(out.strip().splitlines()[-1])
    ref = subprocess.run([swetest, f"-edir{ephe}", f"-bj{jd!r}", "-ut", f"-p{plist}", "-fl", "-head",
                          f"-house{lon!r},{lat!r},{hs}"], capture_output=True, text=True).stdout.split()
    vals = [float(x) for x in ref]
    for k, b in enumerate(res["bodies"]):
        worst_body = max(worst_body, angdiff(b["lon"], vals[k]))
    for k, c in enumerate(res["houses"]["cusps"]):
        worst_house = max(worst_house, angdiff(c, vals[len(bodies) + k]))
print(f"charts compared: {N}")
print(f"max body difference : {worst_body*3600:.6f} arcsec")
print(f"max cusp difference : {worst_house*3600:.6f} arcsec")
