import json,glob,re,collections
D='/tmp/claude-1000/ai-policy-scan'
TERM=re.compile(r'\b(AI|A\.I\.|LLMs?|Copilot|ChatGPT|Claude|Gemini|Cursor|generative|gen-?AI|machine[- ]generated|artificial intelligence|large language models?|agentic|vibe[- ]?cod\w*|AI-\w+)\b')
CONTEXT=re.compile(r'contribut|submit|pull request|\bPRs?\b|patch|commit|merge|generat|assist|disclos|written|issue|report|code|review|accept',re.I)
NEG=re.compile(r"\b(not|no|never|prohibit\w*|forbid\w*|forbidden|ban(ned|s)?|reject\w*|declin\w*|refus\w*|disallow\w*|must not|don't|do not|won't|strictly|unwelcome)\b",re.I)
DISC=re.compile(r'disclos|declare|mention|indicate|label|Assisted-by|Generated-by|Co-authored-by|let us know|note (that|which)|tell us|state (the|that|if|whether)|acknowledg|attribut|transparen|\[ ?[xX ]?\] .*AI',re.I)
RESP=re.compile(r'responsib|accountab|understand|human|review (all|and|it|the)|your own|take ownership|fully',re.I)
WELC=re.compile(r'welcome|encourage|embrace|happy to|feel free|you (may|can) use|allowed|permitted|acceptable|fine to',re.I)
OPEN_FIRST=re.compile(r'(open|file|create|start)( an?)? (issue|discussion|thread)[^.]{0,40}(first|before)|discuss[^.]{0,40}before|before (you )?(send|submit|open|writ)\w*[^.]{0,60}(issue|discuss|talk)|(do not|don.t|not|no longer) (currently )?(accept|accepting|taking|take|open)[^.]{0,30}(pull requests|contributions|patches|PRs|external)|(pull requests|contributions|PRs)[^.]{0,30}(are )?not (currently )?(accepted|accepted|welcome)|closed to (outside )?contribut|read-only mirror',re.I)
def sents(t):
    t=re.sub(r'`{3}.*?`{3}','',t,flags=re.S)
    t=re.sub(r'<!--.*?-->',' ',t,flags=re.S)
    parts=re.split(r'(?<=[.!?])\s+|\n\s*\n|\n[-*#]+ ',t)
    return [re.sub(r'\s+',' ',p).strip() for p in parts if p.strip()]
def classify(s):
    s0=s
    if NEG.search(s) and re.search(r'(AI|LLM|generat|Copilot|ChatGPT|machine)',s,re.I) and re.search(r'(not|no|never|prohibit|forbid|ban|reject|declin|refus|disallow|must not|don.t)\s+\w*\s*\w*\s*(accept|allow|permit|use|submit|contribut|AI|LLM|generat|content|code)|ban|prohibit|forbid|strictly|no AI|no LLM|not (accept|allow)',s,re.I) and not re.search(r'without|unless|if you|only if|except',s,re.I): return 'banned'
    if DISC.search(s): return 'disclosure'
    if RESP.search(s): return 'responsibility'
    if WELC.search(s): return 'welcome'
    return 'mention'
PRI=['banned','disclosure','responsibility','welcome','mention']
res={}
for f in sorted(glob.glob(D+'/raw/*.json')):
    r=json.load(open(f)); pid=r['id']
    o={'id':pid,'repo':r.get('nameWithOwner') or f"{r['owner']}/{r['name']}",'error':bool(r['error']),'archived':r.get('isArchived'),'stars':r.get('stargazerCount'),'contributing_files':[],'ai_policy_files':[],'agent_files':[],'pr_template_ai':[],'ai_hits':[],'open_signals':[]}
    if r['error']: res[pid]=o; continue
    base=f"https://github.com/{o['repo']}/blob/HEAD/"
    for path,v in r['files'].items():
        g=v['group']
        if v['type']=='Tree':
            if g=='agent': o['agent_files'].append(path+'/')
            continue
        txt=v.get('text') or ''
        if g=='contrib': o['contributing_files'].append(path)
        if g=='aipolicy': o['ai_policy_files'].append(path)
        if g=='agent': o['agent_files'].append(path)
        for s in sents(txt):
            if g in('contrib','aipolicy','prtpl') and TERM.search(s) and (CONTEXT.search(s) or g!='contrib') and 12<len(s)<700:
                # drop pure product mentions: need contributor-ish word or generation word in contrib files
                if g=='contrib' and not re.search(r'contribut|submit|pull request|\bPRs?\b|patch|generat|assist|disclos|written|use of|using|tool',s,re.I): continue
                c='banned' if g=='aipolicy' and False else classify(s)
                o['ai_hits'].append({'file':path,'group':g,'cat':c,'sentence':s[:400],'url':base+path})
            if g=='contrib' and OPEN_FIRST.search(s) and len(o['open_signals'])<3:
                o['open_signals'].append({'file':path,'sentence':s[:300],'url':base+path})
        if g=='prtpl' and re.search(r'\bAI\b|LLM|Copilot|ChatGPT|generative',txt): o['pr_template_ai'].append(path)
    hits=o['ai_hits']
    if o['ai_policy_files'] and not hits: o['ai_hits']=hits
    o['category']=min((h['cat'] for h in hits),key=PRI.index) if hits else ('dedicated_file_only' if o['ai_policy_files'] else 'none')
    o['has_contributing']=bool(o['contributing_files'])
    res[pid]=o
json.dump(res,open(D+'/results.json','w'),indent=1)
v=[x for x in res.values() if not x['error']]
print('github projects',len(res),'errors',len(res)-len(v))
print('contributing',sum(x['has_contributing'] for x in v))
print('ai policy file',sum(bool(x['ai_policy_files']) for x in v))
print('any ai mention',sum(x['category']!='none' for x in v))
print('agent files',sum(bool(x['agent_files']) for x in v))
print('agent breakdown',collections.Counter(a.rstrip('/') for x in v for a in x['agent_files']))
print('pr template ai',sum(bool(x['pr_template_ai']) for x in v))
print('open signals',sum(bool(x['open_signals']) for x in v))
print(collections.Counter(x['category'] for x in v))
