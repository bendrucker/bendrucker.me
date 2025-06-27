---
title: Collaborating Asynchronously to Get More Done
subtitle: How applying a software design principle made work meaningful again
publishDate: 2013-11-06
categories: Productivity, Code
---

I've been thinking a lot lately about remote work and building a distributed team. Not having a class or work schedule is a new experience for me. Without any clue how to cope with that, I ended up adopting a nine-to-five-style routine, despite total freedom to do otherwise. That became a serious bottleneck for a team that hails from four cities and three time zones, so I started from scratch in search of a better way to work.

Tim Ferris's [The Four Hour Workweek](http://amzn.com/B002WE46UW) emphasizes blocking—using long chunks of interrupted time for important tasks to minimize the costly mental inefficiency of switching from one task to another. The term _blocking_ caught my eye, as it has an similar definition in software development. Blocking, in programming, refers to operations that prevent anything else from executing until they finish. It usually comes with a negative connotation, for the same reason it's so important for _mental_ computation. More on that later. 

Programming as a metaphor for collaborative work came up again in [Remote](http://amzn.com/B00C0ALZ0W), written by Jason and David of 37signals, a pioneer of the software as a service industry and the creator of Ruby on Rails. Remote prescribes asynchronous communication as the key to replacing the feeling of "business" with a steady stream of accomplished work. **That was it.** I already understood how to teach a computer how to work efficiently—all I had to do was adopt the same practices for myself. This isn't just for geeks—these habits are for _everyone_, programmer or non-programmer, remote worker or nine to five corporate employee.

## Programming Concepts for Non-Programmers

**Seasoned developers, please skip ahead.** In order for the programming metaphor to make a shred of sense, I want to offer a quick primer on synchronous versus asynchronous computing. Synchronous patterns (per the prefix) are predictable and chronological. If you execute operations _A_ and _B_, _A_ will run to completion before _B_ can start. While this makes it easy to understand the flow of operations in your program, it also introduces a serious bottleneck (_blocking_). When _A_ runs, it blocks the rest of the program from proceeding. Let's add some detail about what _A_ and _B_ actually do:
* _B_: a very simple, nearly instantaneous (10 milliseconds) operation
* _A_: a complex and length query to a different server for information on a database (1 second)

_B_, while itself imperceptibly fast, takes a full 1.01 seconds to return, since it had to wait for _A_ to finish before it could run. 

How serious of a problem can synchronous architecture pose? [Just look at Healthcare.gov](http://talkingpointsmemo.com/cafe/a-programmer-s-perspective-on-healthcare-gov-and-aca-marketplaces). If _A_ occasionally fails completely or sometimes takes ten seconds instead of one, the entire system implodes, no matter how robust _B_ is in isolation. Like our brains, web applications don't receive simple sets of instructions that require one component. They have multiple pieces that handle different kinds of information and operations, all of which have to work together. And like our brains, the components that process information are more numerous and complex than the the ones that simply perceive it and pass it along to the right destination.

Asynchronous patterns (non-blocking) are a good deal more complicated, but _scale_ much more smoothly. Asynchronous design allows _A_ and _B_ to run simultaneously, while introducing a challenge of its own: unless we specifically tell _B_ to wait for _A_, _B_ will not know about the results of _A_. If you make every operation wait for the previous one, you've just constructed a synchronous system with more overhead. To reap the benefits of asynchronous design, you need to embrace the fact that the order in which you farm out tasks is not necessarily the order in which they will finish. 

## Asynchronous in the Real World

**Programmers, you can rejoin us here.** As powerful as asynchronous design may seem, computers have constraints too. We can't just press the asynchronous button and magically run 1,000 different operations in parallel. Building that level of parallelism on a computer is no easy task, and our brains are certainly not capable of it. Node.js, a popular framework for building web applications, actually mirrors our brains quite nicely. Node.js won't automatically run any operation in parallel. Calculating Pi to 100 digits, for example, would block and force the program to wait. Node.js gives the developer asynchronous superpowers without the usual complexity because it manages asynchronous _I/O_, (input/output). Node runs your application in one thread and handles I/O in one or more others. So while your app is still synchronous and ticks along line by line, retrieving data from a database, receiving a request from a user's browser, or saving a file to a disk doesn't make the program wait. This is called the _event loop_.

The event loop, per its name, is essentially looping through a list of all the pending I/O requests your application made, checking each to see if it's finished, and handing the result back to the app when it finds a completed request. 

## Asynchronous Productivity

What does all this technical jargon mean when it comes to working effectively and getting things done? 

Software implementations like Node and our brains are unified by a single overarching principle of work: **multitasking is impossible**. Working on multiple things at once requires some sort of external device to separate the work and queue it until it can be processed. Interleaving disparate tasks without that external structure is difficult for a computer, let alone a human. Unlike a computer, we _want_ to block as much as possible. The brain is a machine designed to execute one task at a time and incurs steep costs each time it switches to a different task. 

Constant communication between members of a team breaks the blocking model. How do you preserve your blocks without moving to some far-off location without the distractions of Internet or phone? Enforce an asynchronous communication policy wherever possible. The dreaded email, when used properly, is the fundamental unit of asynchronous messaging. It sits in a queue and the expected response time is indefinite, though usually within twenty four hours. A project management tool like [Asana](http://asana.com) is a more advanced queue, but still fundamentally follows the same asynchronous pattern.

Phone calls and meetings are inherently synchronous. Phone calls block all other work until they are complete. Meetings are even more costly—you might spend just as much time traveling and waiting as you do engaged in discussion. While most people could consciously cut down on unnecessary phone calls and meetings, not all communication can or should happen asynchronously. Just as a programmer carefully polices costly synchronous operations, you should set aggressively short meeting and call times, carefully define expectations in advance, and save blocking communication for critical contacts. 

These techniques will fall flat if you try to hide from the inherent tradeoffs of asynchronous design (responses are not immediate and order is not guaranteed). Don't just acknowledge them—embrace them. 

No tool will cure you of the temptation to work synchronously. For me, asynchronous email means checking no more than twice a day and anticipating a *minimum* response time of 12 hours for any email I send. All of a sudden the much maligned email became my second (behind Asana) favorite way to communicate for work. 

The key is to limit each mode of communication to strictly asynchronous or synchronous at all times. I'm so fanatical about preserving that line that I disabled voicemail (asynchronous) on my phone entirely—call your carrier if you want to do the same.

A pleasant side effect of separating synchronous communication (calls and meetings) is that you'll be able to easily defer communication that isn't important enough to block work—shift it to an asynchronous channel. Taking a day off becomes infinitely more enjoyable when the majority of your communication is asynchronous. You can actually take time off, not just thumb your phone from somewhere that's not your office. You can build your schedule around family, travel, or whatever real-life, blocking pursuits are important to you. 

Unless you're in sales, you're not getting paid to communicate.  You're getting paid to get work done, and you have more freedom than you realize when it comes to defining where and when that work happens. You're not Node—don't try to work as if you have its event loop to manage your communication. If you spend your day looping back to your inbox every five minutes, 5 o'clock will roll around and you'll have accomplished little. Instead, dramatically lengthen the time between loops and use the savings for longer blocks of work. You'll accomplish more while working less. 