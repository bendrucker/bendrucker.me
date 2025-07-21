---
author: Ben Drucker
pubDatetime: 2013-10-08T12:00:00Z
title: How Citi Bike Salvaged a Botched Launch
draft: false
tags:
  - Startups
description: Why you might want to reconsider "launching"
---

With more than seventy thousand members, 2.5 million trips, and five million miles traveled, New York’s newly created Citi Bike program is nothing short of a massive success. The privately funded, for-profit program is so popular that City Councilmen are [begging](http://www.nydailynews.com/new-york/citi-bike-stuck-gear-article-1.1413269) to use public funds to speed expansion into the outer boroughs, calling it “a piece of public transportation infrastructure.” And yet at launch, Citi Bike managed to alienate both the anti-bike crowd (understandable) as well as its most eager customers (unforgivable). Month-long waits for new subscribers, broken bikes and docks, and availability problems in high traffic areas turned its first users into vocal critics. Three months since its May launch, complaints have all but disappeared.

In a city famous for complaining about just about everything, you can bet that’s not because New Yorkers got tired of whining. Citi Bike, very much to its credit, has addressed nearly all its most severe shortcomings. What began as novel but unreliable experiment in transportation has become the primary means of commuting for me and tens of thousands of other New Yorkers. Citi Bike has quietly accomplished a rare feat: it salvaged a botched launch. Its dramatic reversal can teach us a lot about how to recover from a launch that goes less than smoothly. But perhaps its most important lesson is this: you probably shouldn’t "launch" your company at all.

First, it’s worth highlighting two steps Citi Bike could have taken to make its launch more successful from the start:

### Betas Are (Mostly) Useless
Citi Bike ran a [relatively unknown trial](http://www.streetsblog.org/2012/10/23/citi-bike-kiosks-running-in-previews-for-brooklyn-navy-yard-workers/) of the system inside the Brooklyn Navy Yard more than six months before the public launch. This probably did actually help fix some issues in advance. But the most serious problems only become clear at scale. If you run a beta test in an environment dramatically different than the real world, your first real-world customers will be beta testers. In some cases that might be acceptable. But if you’re selling mission-critical infrastructure, don’t tempt your customers with something that’s not ready for primetime. They’ll snap it up and you’ll be stuck with a bunch of angry early-adopters.

### Educate Your Customers
Docking and undocking a Citi Bike is a delicate operation. Maneuvered the right way, the bike slides in and out easily. Patient members discover this carefully-guarded secret on their own or are initiated by a Citi Bike veteran. The rest, presumably in too much of a hurry to care, violently bash the defenseless dock with the front of the bike until the locking mechanism is jolted violently enough to engage. Hyperbole aside, I’d bet that “user error” is responsible for the vast majority of damaged stations and bikes. You can hardly blame the user though—members are berated with warnings about helmets and bike lanes, but are never instructed on how to actually use the system. A little signage and a video demonstration could have avoided expensive damage and downtime. What becomes second nature to the product’s creator will be far from obvious to users.

Avoidable mistakes aside, Citi Bike executed an impressive turnaround. A botched launch can seem like a failure with next to no chance of recovery. Here’s how Citi Bike proved otherwise:

### Fixing the Problem is Your Best PR
There wasn’t much in the way of communication to the thousands of angry subscribers who waited weeks to receive their key. I got an email or two, apologizing for longer than expected wait times. The first lesson of crisis PR is to “control the message,” but Citi Bike chose not to do that, even in the face of [public ridicule](http://observer.com/2013/07/gimme-an-s-gimme-an-h-shiti-bike-stickers-take-over-nyc-twitter/). And then all of a sudden, everyone stopped talking about the woes of the new bikeshare program. Why? The most egregious issues were being fixed, and it was obvious the program was making a serious effort to better serve its customers. Mollifying customers should be saved for when they’re panicking senselessly, as in the recent Tesla S fire, [addressed brilliantly by Elon Musk](http://www.teslamotors.com/blog/model-s-fire) or Apple’s short-lived “antennagate” controversy in 2010. When the product really is broken, fix it instead of trying to convince customers that the damage isn’t really that bad.

### Experiment with Taking Away Features
Citi Bike didn’t opt for a gradual launch—dozens of stations appeared seemingly overnight. Bike usage has shown a pretty consistent pattern. Stations in residential neighborhoods empty by 8 a.m. and ones in major commercial areas fill up soon after. By 8 p.m. the reverse is true. Good luck docking your bike in the East Village after sundown.

Rather than launch gradually, Citi Bike has chosen to uproot and plant new docks, again, seemingly overnight. If the dock across the street from your building is torn out, you’re probably not especially happy. But rotating dock locations quickly allows Citi Bike to better accommodate the flow of commuter traffic. Be very careful about giving your customers a feature they will come to depend on. Experiment quickly and often, and they’ll come to understand the difference between a trial and a permanent fixture of the product.

### It's Going to Cost You
The most critical lesson of Citi Bike’s salvaged launch is that fixing mistakes will become enormously expensive. They beefed up their call center. I called customer support twice before my key arrived—both reps told me that they were adding new reps as fast as they could and could barely train them fast enough. Some of the trucks the program uses to even out inventory by shuttling bikes between stations are white vans with Citi Bike decals. Others are Penske moving fans, on temporary lease. The data API was unreliable even at launch—I can only imagine how many hours the technical team has put into making sure it can scale to traffic 3 or 4 orders of magnitude larger than it saw then.

None of these fixes are cheap. But with tens of millions in private funding, Citi Bike could afford to prevent early issues from jeopardizing its future growth.

## Can You Afford to Launch?
With $50 million from Citibank and MasterCard, Citi Bike could. But can you? By no stretch of the imagination would I advocate operating in stealth-mode, especially if you’re building software. But I would argue that it is time to kill the press launch. There are any number of better ways to reach investors. And press is a way to accelerate customer growth, not kickstart it. If you could say with 100 percent certainty that you’d launch without a hitch, I’d say go for it. But bumps in the road—potentially big ones—are inevitable, so you should might want to reconsider whether a highly orchestrated launch is the best idea. You unlike CitiBike, probably can’t recover if something goes significantly wrong.