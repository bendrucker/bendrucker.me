---
title: How to Start Contributing to Open Source
subtitle: Open source lets you give back and learn more. The hardest part is getting started.
date: 2014-02-19
categories: Software, Open Source
template: post.jade
---

Even while starting a company, I devote a lot of time to open source software projects. I contribute to a few bigger projects (including [Bookshelf](http://bookshelfjs.org) and [Knex](http://knexjs.org) one of two collaborators helping [the author](https://github.com/tgriesser)) and spend time on a handful of small projects of my own. It's something new developers always want to ask me about. At this point GitHub has all but replaced the resume. Not only is every commit available for anyone to see, but also every issue, pull request, and comment (more on how to dissect GitHub as an employer in a future post). 

Most of these questions from new developers are prefaced with: "open source is intimidating. I don't know where to start." It's a chicken and egg problem. Learning to write high quality code is the obvious fix, but open source contributions are also one of the best ways to improve your abilities as a developer. Here are a few guiding principles for cutting through the intimidation and getting started in the open source community:

## 5 Rules for Getting Started in Open Source

### Read The Rules

Most repositories have contribution guidelines (*CONTRIBUTING.MD*), a readme that outlines expectations, or both. Read them! They're usually short and direct. Projects with a high volume of incoming issues and pull requests tend to be especially strict. Violating the contribution guidelines sends a bad message to the maintainer—if you couldn't be bothered to spend two minutes reading the guidelines, chances are your request won't be well thought out either. 

### Ask, Don't Tell

While it's increasingly common for companies to allow employees to devote work hours to open source projects, most maintainers are spending their leisure time to support a free product. The worst way to approach someone who is giving you their time and energy without direct compensation is to be accusatory or act entitled. If you're inexperienced, there's no need to hide it. No one will ever snap at you for: "I think this might be a bug but I'm new to *Project* so I might just be doing something wrong."

### Document, Document, Document

"I'm having trouble with *Feature/Method*. According to the docs (*link to the relevant section*) I would expect *Expectation*. Instead I'm seeing *Result*. Here's what I'm doing: *Sample Code*."

Make it easy for someone to help you. Use proper [GitHub Flavored Markdown](https://help.github.com/articles/github-flavored-markdown#syntax-highlighting), especially [syntax highlighting](https://help.github.com/articles/github-flavored-markdown#syntax-highlighting). Include links to the relevant lines in your own project. Don't make a veteran contributor work harder than they need to: they're already helping you for free. 

Managing a project for a diverse group of "customers" is exceptionally difficult. There's a huge difference between building a project for yourself and building one that tens of thousands of people will depend on. It's generally much easier to add new behaviors as an end user than to strip out defaults ([example](https://github.com/tgriesser/bookshelf/issues/241#issuecomment-35385630)). If you think a particular feature should be part of the core library, come prepared with:

1) A fully functional implementation that you patched in in your own application(s);
2) A convincing argument for why your addition belongs in the library rather than in "[userland](https://github.com/joyent/node/wiki/node-core-vs-userland)," left to individual developers to implement as they choose. 

### Fix Your Own Problems

Don't waste time actively looking for a project to contribute to. Until you're ready to release and support your own community projects, build whatever you'd like. When you encounter a missing feature, a bug, or documentation that could use improvement in a dependency, treat it like a bug in your own application. Fix it right away, while it's still fresh in your mind. If you do eventually evolve into a contributor, you'll already know the project well and have an understanding of what areas need attention. 

### Watch and Contribute

Once you've started to feel comfortable with a project, you should [watch](https://help.github.com/articles/watching-repositories) the GitHub repository. As a watcher, you'll receive notifications for every new issue (not just the ones that mention you). If you see a question you know you can answer, feel free to jump in and help. But if you're not confident in your answer, just make sure to note that. There's no sense in sending a newcomer down the wrong path if they are asking a genuinely difficult question. Most of the time, though, you'll be able to add value as a user with a solid understanding of the documentation. You don't need to be an expert to link people to the right section of the docs. 

## Software is Made by Humans

Above all, remember that your fellow contributors are human. Yes, [even TJ Holowaychuk](http://www.quora.com/TJ-Holowaychuk-1/How-is-TJ-Holowaychuk-so-insanely-productive). Be friendly, clear, and respectful and you'll get the same in return. It's more fun building things together. 
