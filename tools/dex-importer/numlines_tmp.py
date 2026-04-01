import sys, pathlib 
p=pathlib.Path(sys.argv[1]) 
lines=p.read_text(encoding='utf-8').splitlines() 
for i,line in enumerate(lines,1): print(f'{i}: {line}') 
