m = "updated project files"

stats:
	git status -s

commit:
	git add -A
	git add *
	git commit -m "$(m)"

push:
	git push -u origin master

git: commit push

.PHONY:  stats commit push git
.SILENT: stats commit push git