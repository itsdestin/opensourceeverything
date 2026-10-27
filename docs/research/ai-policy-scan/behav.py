import json,glob,subprocess,datetime,random,collections
D='/tmp/claude-1000/ai-policy-scan'
since=(datetime.date(2026,10,26)-datetime.timedelta(days=90)).isoformat()
rs=[json.load(open(f)) for f in glob.glob(D+'/raw/*.json')]
rs=[r for r in rs if not r['error'] and not r.get('isArchived') and r.get('stargazerCount',0)>=200]
random.seed(1); random.shuffle(rs); rs=rs[:40]
out={}
for r in rs:
    s=f"{r['owner']}/{r['name']}"
    q='''query{
 m:search(query:"repo:%s is:pr is:merged merged:>=%s",type:ISSUE,first:100){issueCount nodes{... on PullRequest{authorAssociation}}}
 gfi:search(query:"repo:%s is:issue is:open label:\\"good first issue\\"",type:ISSUE,first:1){issueCount}
 hw:search(query:"repo:%s is:issue is:open label:\\"help wanted\\"",type:ISSUE,first:1){issueCount}
}'''%(s,since,s,s)
    p=subprocess.run(['gh','api','graphql','-f','query='+q],capture_output=True,text=True)
    try: d=json.loads(p.stdout)['data']
    except Exception: out[r['id']]={'repo':s,'error':(p.stdout+p.stderr)[:200]}; continue
    c=collections.Counter(n.get('authorAssociation') for n in d['m']['nodes'] if n)
    ft=c['FIRST_TIME_CONTRIBUTOR']+c['FIRST_TIMER']; ct=c['CONTRIBUTOR']; mem=c['MEMBER']+c['OWNER']+c['COLLABORATOR']
    tot=sum(c.values())
    out[r['id']]={'repo':s,'merged90d':d['m']['issueCount'],'sampled':tot,'first_time':ft,'prior_contributor':ct,'insider':mem,'outsider_share':round((ft+ct)/tot,2) if tot else None,'gfi_open':d['gfi']['issueCount'],'help_wanted_open':d['hw']['issueCount']}
json.dump(out,open(D+'/behaviour.json','w'),indent=1)
print(len(out))
