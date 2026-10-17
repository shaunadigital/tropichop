"""Automated play-test: load the game, start, spawn fruit, swipe through them, screenshot.
Usage: python3 tools/playtest.py <url> <outdir>
"""
import sys, asyncio, math
from playwright.async_api import async_playwright

URL, OUT = sys.argv[1], sys.argv[2]

async def run(page, tag, w, h):
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    await page.goto(URL)
    await page.wait_for_function("window.__tropichop && window.__tropichop.state === 'menu'", timeout=15000)
    await page.wait_for_timeout(600)
    await page.screenshot(path=f"{OUT}/{tag}-1menu.png")
    await page.click("#playBtn")
    await page.wait_for_timeout(300)
    # stop natural spawns from interfering: spawn a controlled set
    await page.evaluate("""() => { const g = window.__tropichop;
      for (const k of ['lilikoi','mango','dragonfruit','guava','lychee','starfruit','pineapple','coconut']) g.spawn(k, 0); }""")
    hit_log = []
    for step in range(14):
        await page.wait_for_timeout(130)
        objs = await page.evaluate("() => window.__tropichop.objs.filter(o=>o.delay<=0 && !o.isHaz && o.y < innerHeight - 30).map(o=>[o.x,o.y,o.kind])")
        for x, y, k in objs[:3]:
            await page.mouse.move(x - 90, y - 50)
            await page.mouse.move(x + 90, y + 50, steps=4)
            hit_log.append(k)
        if step == 3:
            await page.wait_for_timeout(40)
            await page.screenshot(path=f"{OUT}/{tag}-2slice.png")
    await page.wait_for_timeout(200)
    await page.screenshot(path=f"{OUT}/{tag}-3after.png")
    # hazard test
    await page.evaluate("() => window.__tropichop.spawn('slippah', 0)")
    for _ in range(10):
        await page.wait_for_timeout(120)
        o = await page.evaluate("() => window.__tropichop.objs.filter(o=>o.isHaz && o.y < innerHeight - 40).map(o=>[o.x,o.y])")
        if o:
            x, y = o[0]
            await page.mouse.move(x - 80, y)
            await page.mouse.move(x + 80, y, steps=4)
            await page.wait_for_timeout(60)
            await page.screenshot(path=f"{OUT}/{tag}-4hazard.png")
            break
    st = await page.evaluate("() => ({score: window.__tropichop.score, lives: window.__tropichop.lives, state: window.__tropichop.state})")
    # let it run to game over
    await page.wait_for_timeout(9000)
    await page.screenshot(path=f"{OUT}/{tag}-5later.png")
    st2 = await page.evaluate("() => ({score: window.__tropichop.score, lives: window.__tropichop.lives, state: window.__tropichop.state})")
    print(tag, "after swipes:", st, "later:", st2, "errors:", errs[:5])

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for tag, w, h, mobile in [("desktop", 1280, 800, False), ("phone", 390, 844, True)]:
            ctx = await b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if mobile else 1)
            await run(await ctx.new_page(), tag, w, h)
            await ctx.close()
        await b.close()

asyncio.run(main())
