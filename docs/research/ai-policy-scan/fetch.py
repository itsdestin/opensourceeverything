import json,re,subprocess,os,sys
D='/tmp/claude-1000/ai-policy-scan'
proj=json.load(open('/home/destin/trueopensource/alternatives-map/data/projects.json'))['projects']
FILES={
 'contrib':['CONTRIBUTING.md','CONTRIBUTING.rst','CONTRIBUTING','CONTRIBUTING.txt','CONTRIBUTING.adoc','contributing.md','.github/CONTRIBUTING.md','.github/CONTRIBUTING.rst','.github/contributing.md','docs/CONTRIBUTING.md','docs/contributing.md','docs/CONTRIBUTING.rst','doc/CONTRIBUTING.md','docs/contributing.rst','docs/source/contributing.rst','HACKING.md','HACKING.rst','DEVELOPMENT.md'],
 'aipolicy':['AI_POLICY.md','AI-POLICY.md','AI_POLICY','.github/AI_POLICY.md','docs/AI_POLICY.md','docs/ai-policy.md','docs/policies/ai.md','AI.md','GENAI.md','docs/AI.md','.github/AI-POLICY.md','docs/AI_USAGE.md','AI_USAGE.md','LLM_POLICY.md','POLICY.md','docs/ai_policy.md','docs/contributing/ai.md'],
 'agent':['AGENTS.md','CLAUDE.md','GEMINI.md','.github/copilot-instructions.md','.cursorrules','.windsurfrules','.cursor/rules','.claude','.github/instructions'],
 'prtpl':['.github/pull_request_template.md','.github/PULL_REQUEST_TEMPLATE.md','PULL_REQUEST_TEMPLATE.md','pull_request_template.md','docs/pull_request_template.md','.github/PULL_REQUEST_TEMPLATE'],
}
items=[(g,f) for g,l in FILES.items() for f in l]
def q(owner,name):
    parts=[]
    for i,(g,f) in enumerate(items):
        parts.append(f'f{i}: object(expression:"HEAD:{f}"){{__typename ... on Blob{{text byteSize isTruncated}} ... on Tree{{entries{{name}}}}}}')
    return 'query{repository(owner:"%s",name:"%s"){nameWithOwner isArchived pushedAt isFork stargazerCount hasIssuesEnabled defaultBranchRef{name} licenseInfo{spdxId} %s}}'%(owner,name,' '.join(parts))
n=0
for p in proj:
    c=p.get('code') or ''
    m=re.match(r'(?:https?://)?github\.com/([^/]+)/([^/#?]+?)(?:\.git)?/?$',c)
    out=f"{D}/raw/{p['id']}.json"
    if not m or os.path.exists(out): continue
    o,nm=m.groups()
    r=subprocess.run(['gh','api','graphql','-f','query='+q(o,nm)],capture_output=True,text=True)
    try: j=json.loads(r.stdout)
    except Exception: j={'error':r.stderr[:300]+r.stdout[:300]}
    repo=(j.get('data') or {}).get('repository')
    res={'id':p['id'],'code':c,'owner':o,'name':nm,'error':None if repo else (j.get('errors') or j.get('error')),'files':{}}
    if repo:
        for k in ('nameWithOwner','isArchived','pushedAt','isFork','stargazerCount','hasIssuesEnabled'): res[k]=repo.get(k)
        for i,(g,f) in enumerate(items):
            v=repo.get(f'f{i}')
            if v: res['files'][f]={'group':g,'type':v['__typename'],'text':v.get('text'),'entries':[e['name'] for e in v.get('entries',[])] if v.get('entries') else None}
    json.dump(res,open(out,'w'))
    n+=1
print('fetched',n)
