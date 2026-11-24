#!/usr/bin/env python3
"""주간 스케줄 스크립트 단독 실행 테스트 (DOM 대신 가짜 객체).

- index.html 에서 '📅 주간 공부 스케줄' 스크립트만 떼어 quickjs 로 평가
- ROOM 데이터로 window.ROOM_LEC 를 만들어 두고, 그려진 7일 칸의 글자를 확인
- 날짜를 바꿔 가며(오늘/다음 주/2회독 구간) 확인하려면 NOW 를 바꿔 실행
"""
import json
import re
import sys

import esprima
import quickjs

HTML = "index.html"


def slice_array(src, name):
    m = re.search(r"var %s = \[|var %s = \{" % (name, name), src)
    if not m:
        raise SystemExit(f"{name} 없음")
    i = m.end() - 1
    depth = 0
    instr = None
    while i < len(src):
        ch = src[i]
        if instr:
            if ch == "\\":
                i += 2
                continue
            if ch == instr:
                instr = None
        elif ch in "\"'`":
            instr = ch
        elif ch in "[{":
            depth += 1
        elif ch in "]}":
            depth -= 1
            if depth == 0:
                return src[m.end() - 1:i + 1]
        i += 1
    raise SystemExit("닫는 괄호 없음")


src = open(HTML, encoding="utf-8").read()

# 1) 스케줄 스크립트 추출
mark = "/* ================= 📅 주간 공부 스케줄"
i = src.index(mark)
j = src.index("</script>", i)
script = src[i:j]

# 2) ROOM → ROOM_LEC 인덱스 (index.html 의 buildRoomIndex 와 같은 규칙)
room = slice_array(src, "ROOM")
ctx = quickjs.Context()
ctx.eval("var ROOM = " + room + ";")
idx = ctx.eval(
    """
    (function(){
      var out = {};
      for (var i=0;i<ROOM.length;i++){
        var g=ROOM[i];
        for (var j=0;j<g.tracks.length;j++){
          var tr=g.tracks[j];
          for (var m=0;m<tr.months.length;m++){
            var mo=tr.months[m];
            for (var k=0;k<mo.lec.length;k++){
              var L=mo.lec[k];
              out[tr.id+"-"+L.n]={n:L.n,topic:L.topic,title:L.title,ch:L.ch};
            }
          }
        }
      }
      return JSON.stringify(out);
    })()
    """
)
room_lec = json.loads(idx)

# 3) 가짜 DOM
harness = r"""
var OUT = {days:'', sum:'', range:'', foldHidden:null, toggle:''};
function El(id){
  this.id=id; this._html=''; this.style={}; this.hidden=false; this.disabled=false;
  this.textContent=''; this.listeners={};
}
Object.defineProperty(El.prototype,'innerHTML',{
  get:function(){ return this._html; },
  set:function(v){ this._html=v; if(this.id==='wkDays') OUT.days=v;
                   if(this.id==='wkSum') OUT.sum=v; if(this.id==='wkRange') OUT.range=v; }
});
El.prototype.setAttribute=function(k,v){ if(this.id==='wkToggle'&&k==='aria-expanded') OUT.aria=v; };
El.prototype.addEventListener=function(t,f){ (this.listeners[t]=this.listeners[t]||[]).push(f); };
El.prototype.classList={contains:function(){return false;}};
var els={};
var document={
  readyState:'complete',
  getElementById:function(id){ return els[id] || (els[id]=new El(id)); },
  addEventListener:function(){},
  visibilityState:'visible'
};
var window=this;
var localStorage={ _d:{}, getItem:function(k){ return this._d[k]||null; },
  setItem:function(k,v){ this._d[k]=v; } };
var navigator={};
"""

ctx.eval(harness)

# '오늘'을 바꿔 보기: python3 scripts/test_week_schedule.py 2027-02-14
if len(sys.argv) > 1:
    import datetime
    y, m, d = (int(x) for x in sys.argv[1].split("-"))
    noon_kst = datetime.datetime(y, m, d, 12, 0, tzinfo=datetime.timezone(datetime.timedelta(hours=9)))
    ctx.eval("Date.now = function(){ return %d; };" % int(noon_kst.timestamp() * 1000))
    print("# 오늘 =", sys.argv[1])

ctx.set("ROOM_LEC", ctx.eval("JSON.parse(%s)" % json.dumps(json.dumps(room_lec))))
ctx.eval("window.ROOM_LEC = ROOM_LEC;")
ctx.eval(script)

# 4) 결과 확인
days = ctx.eval("OUT.days")
if len(sys.argv) > 1 and "--week" in sys.argv:
    pass
print("SUM :", re.sub(r"<[^>]+>", "", ctx.eval("OUT.sum")))
print("RANGE:", re.sub(r"<[^>]+>", "", ctx.eval("OUT.range")))
rows = re.findall(r'<span class="wk-dl"><b>(.*?)</b><small>(.*?)</small></span>(.*?)<span class="wk-ck"', days, re.S)
for dow, date, rest in rows:
    txt = [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", seg)).strip() for seg in rest.split("</span><span")]
    print(f"-- {dow} {date}")
    for line in re.findall(r'<span class="(wk-tr|wk-li[^"]*)"[^>]*>(.*?)</span>', rest, re.S):
        print("   ", line[0], "|", re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", line[1])).strip())

# 5) JS 문법 검사(esprima)
esprima.parseScript(script)
print("\n✅ esprima 문법 검사 통과")
