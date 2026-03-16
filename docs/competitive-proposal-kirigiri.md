

# A Proposal for the Competitive Council

## Intro

A few weeks ago I gave a brief description on how competitive mafia might be run on BM; in this paper I have decided to flesh it out a bit more and make it into a full proposal. I have had a read of some of the things discussed in this channel and taken some of them into account, but I am still convinced that we should try to create something that is distinct and an improvement from the format used in EM, that while often a lot of fun, still had a few significant flaws.

As a lover of the game of mafia and someone who was part of the EM community for a number of years, I want to try to design a competition that is better that what has gone before, but is also familiar to and will be accepted by such like-minded people.

Without further ado, let’s get into the meat of things:

## Structure

### Entry Requirements

In order to create a hurdle for potentially abusive users but without being too arduous a requirement, I propose that an account must have at least **30** completed ranked games on their account (which is currently not suspended from ranked play) in order to enter the competition. On EM the requirement was 1,500 points, which on unboosted setups would imply around **50** games to achieve the approximately 25 ranked wins necessary. I think this is perhaps a little too many in hindsight and in respect to the current state of the community.  
Alts would still of course be permitted, (as has been said, we do need to fill the games, and we shouldn’t close off too many avenues that help us in this regard\!)  and long-standing players with say, at least **100** ranked games on one account could be given the option to automatically whitelist an alt without having to grind out the games on that account specifically.

### Determining Setup Win Ratios and Point Payouts

For the purpose of generating setup win ratios, I adapted the Elo point-exchange algorithm to generate a rating to represent the implied strength of the village compared to the mafia given the setup’s roles and specifics.

A rating of **1000** in this system represents a village that is theoretically equal to the mafia (the rating of the mafia stays effectively static; what is important is the *difference* between the village and mafia, rather than either side considered individually)

![][image1]  
**R** represents the old rating  
**R’** represents the newly calculated rating  
**W** represents the outcome of the game (1 for a village win, 0 for a mafia win)  
**W\_e** represents the expected outcome of the game given the old rating.  
**K** is an arbitrary value which can be set as desired to change how responsive the system is.  
In this case, I think given the stark difference between even a rating of 1000 and 1050 would represent, I would recommend something small (perhaps even as low as 5?)

Okay so, why do this? I think we need to acknowledge the practicalities at play and use a system that can converge to a sensible(ish) expected win ratio for each side without having to play hundreds of games on the setup that could realistically take months to reach something close to the ‘true’ values.

One should also take into account the inherent volatility of the game of mafia and the fact that in this Elo-derived system, the raw rating could end up overshooting a sensible value due to a long mafia or village winning streak. To respond to this, I would propose using for the **actual rating** that determines point payouts, a rolling average of the past 15 recorded Elo ratings for the setup in question.

In conclusion, I would predict that this system could give relatively sane results for payouts even after as few as 30 ranked games being played, paving the way for setups to be judged worthy or not of competition a lot earlier than in EM.

Moving on to the in-game points payouts that these win-ratios would generate, I have looked at the system that was discussed above (of using **\[N × (1-W)\]**) for some arbitrary N. In this table I have presented this as ‘**Scoring System 2**’. The drawback this gives is that players are somewhat punished for playing less balanced setups, and their expected points per game will be slightly lesser than players that exclusively play setups that are close to precisely balanced.  
My alternative (**Scoring System 1**) is based on a formula of **N/W**, which eliminates this minor issue, although players are more generously rewarded for rolling and winning as roles on the less favoured alignment.

In the chart below I normalised both systems to give 100 points for a win as an alignment with an implied 50% win probability (N \=50; N=200). One can adjust the values as necessary if a different baseline is desired.  
I leave the decision as to which system is better up to the reader.

|  |  | *Scoring System 1* |  | *Scoring System 2* |  |
| ----- | ----- | :---: | :---: | :---: | :---: |
| **Village Elo** | **Implied WR** | **Points per Village Win** | **Points per Mafia Win** | **Points per Village Win** | **Points per Mafia Win** |
| 1100 | 64.01% | 78.1 | 138.9 | 72.0 | 128.0 |
| 1090 | 62.67% | 79.8 | 133.9 | 74.7 | 125.3 |
| 1080 | 61.31% | 81.5 | 129.2 | 77.4 | 122.6 |
| 1070 | 59.94% | 83.4 | 124.8 | 80.1 | 119.9 |
| 1060 | 58.55% | 85.4 | 120.6 | 82.9 | 117.1 |
| 1050 | 57.15% | 87.5 | 116.7 | 85.7 | 114.3 |
| 1040 | 55.73% | 89.7 | 112.9 | 88.5 | 111.5 |
| 1030 | 54.31% | 92.1 | 109.4 | 91.4 | 108.6 |
| 1020 | 52.88% | 94.6 | 106.1 | 94.2 | 105.8 |
| 1010 | 51.44% | 97.2 | 103.0 | 97.1 | 102.9 |
| **1000** | **50.00%** | **100.0** | **100.0** | **100.0** | **100.0** |
| 990 | 48.56% | 103.0 | 97.2 | 102.9 | 97.1 |
| 980 | 47.12% | 106.1 | 94.6 | 105.8 | 94.2 |
| 970 | 45.69% | 109.4 | 92.1 | 108.6 | 91.4 |
| 960 | 44.27% | 112.9 | 89.7 | 111.5 | 88.5 |
| 950 | 42.85% | 116.7 | 87.5 | 114.3 | 85.7 |
| 940 | 41.45% | 120.6 | 85.4 | 117.1 | 82.9 |
| 930 | 40.06% | 124.8 | 83.4 | 119.9 | 80.1 |
| 920 | 38.69% | 129.2 | 81.5 | 122.6 | 77.4 |
| 910 | 37.33% | 133.9 | 79.8 | 125.3 | 74.7 |
| 900 | 35.99% | 138.9 | 78.1 | 128.0 | 72.0 |

I shaded out areas of the chart where either alignment had a higher than 58% expected probability of winning, which is somewhat analogous to the policy used in EM to filter out setups that are overly unbalanced. This should also elucidate the intent of using a low ‘**K**’ factor when designing the rating algorithm for setups to use, so that a setup doesn’t swing between the boundaries of comp-worthiness too violently.

Finally, I’d suggest that point values be **locked** for competitive purposes before the start of the round (as opposed to in EM), so that no player gets an advantage or disadvantage by playing their games at a different time in the round than others after/before points fluctuate.

### Competition Format and Calendar

The basic idea of my format is that each round be dedicated to just one or two setups \- be shorter than in EM (every player gets exactly 28 gold hearts to be played over eight days), and over a season of twelve rounds, constitute a wider championship that covers a period of around six months.

While retaining many aspects of how competitive play worked in EM; gold-heart games would still work as ad-hoc rooms that anyone could host at any time during the round, and there’d still be a leaderboard of all players pooled together ranked by total number of game points scored in the round, this does also present a number of significant departures from convention.

Firstly, shorter rounds: four hearts per account per day, except on an eighth and final day which will allow players a chance to catch up and play out any remaining hearts they may have left over. Hearts would not decay over time and there’d be no maximum to the number any account could have saved up, so in theory one could play all 28 on the final day, though this would probably not be advisable\!

This allows us to fit in the events of a round into a neat two-week slot and provide regular days of the week for rounds to start and end on, making it easy to remember and keep track of. The choice of Friday in this case is semi-arbitrary, though I think whatever choice we make should double count a day that’s part of the weekend (in the longer sense of Friday-Sunday) for most students and working people.

| Friday | Saturday | Sunday | Monday | Tuesday | Wednesday | Thursday |
| :---- | ----- | :---- | :---- | :---- | :---- | ----- |
| Round Day 1 \+4🧡 | Round Day 2 \+4🧡 | Round Day 3 \+4🧡 | Round Day 4 \+4🧡 | Round Day 5 \+4🧡 | Round Day 6 \+4🧡 | Round Day 7 \+4🧡 |
| Round Final Day (catchup, \+0🧡) | (Moderator Review, game of the round nominations and voting \- time for open reports related to the round to be handled and closed) |  |  |  |  | **Round Standings confirmed** |

Now you may notice that I didn’t include any days for choosing setups, and that is indeed deliberate\! This process in my system would take place *in-between* seasons. The rota of 12 or 24 (depending on how many setups used per round) would be decided before any season begins and be publicly available to everyone.

I also included a reference to ‘Game of the Round’ more on that later, for now I’d like to discuss how round results would be aggregated to create a seasonal leaderboard.  
Hmmm... I feel for some reason that some theme music is in order for this part: [Fleetwood Mac - The Chain](https://www.youtube.com/watch?v=JDG2m5hN1vo)

So some of you may be familiar with motorsports such as Formula 1, which award points based on competitors’ classifications in each race. Likewise in mafia, my suggestion would be to give **championship points** (distinct from game points) based on where players finished in each round. Here I’ve simply lifted the regimen that F1 uses; I think a top-10 is a decent enough cutoff for players to be rewarded for.

There’s also no set threshold for the number of points required to ‘hammer’ the round, simply the greatest number of game points at the end of the 28 hearts takes first place\!

| Position | Championship Points |
| :---: | :---: |
| 1st | 25 |
| 2nd | 18 |
| 3rd | 15 |
| 4th | 12 |
| 5th | 10 |
| 6th | 8 |
| 7th | 6 |
| 8th | 4 |
| 9th | 2 |
| 10th | 1 |

In the event of a tie for any position, say for example two players both come in equal third place with the exact same number of game points, both players would score championship points according to the position they share (in this case **15**). If we really want to standardise rounds and ensure the exact same number of total points are given out for final classification each time, one could take the mean of the points payouts and apply it to both players (i.e. **13.5** in this case), but I believe the first option to be simpler and more elegant.

Now, normally placing on the podium (top three) at the end of a round would give a nice shiny trophy icon for their efforts, but in order to distinguish them from seasonal trophies, I propose they be renamed and shown as **medals**… though I guess you could just do smaller and bigger versions of the trophies, or bespoke versions for each season. Something to aesthetically tell the accolades apart is what I’m getting at, I’ll leave that up to the illustrators\!

Oh, what do I mean by **Game of the Round**? Just as a little thing to keep people engaged during the down-time at the end of a round, players could nominate and vote on what their favourite game of the round should be. Ideally the game should display some creativity of thought, power of persuasion, ability to act under pressure, high drama or some combination of the above. As an added incentive I might propose a **bonus championship point** for every player on the winning side of the chosen game, sort of analogous to a bonus point for a fastest lap, but this is purely optional I suppose.

Something I also saw mentioned was the idea of not publishing the leaderboard as the round is in progress. This is something I quite strongly disagree with. Even if the leaderboard is hidden in this way, any determined user should simply construct it by going through the log of completed games for the round, which I assume will be open to all users in the interest of transparency and for the benefit of users being able to submit and respond to reports. At the very least, they would be able to quickly get an idea of how the race for the summit is looking

Finally, as you may have guessed, my idea would be to have championship points added up over the course of the season to provide a final ranking. If we want to allow a little lee-way in terms of not forcing every player to play every single round to have a chance of contending for a trophy, we could alter it so that only the top 11, 10 or perhaps 9 results count for their points total, but my recommendation would be not to go too far with this. We don’t want players to be in an effectively unassailable position too early in the season that would require no effort to defend would we. Would we?  
If there are any ties, a count back of results can be used, sorting by highest number of 1st places, then 2nd, 3rd and so on. If two players are *still* somehow inseparable, then **game points** per game over the season could   
Beyond that, I don’t know, star signs or some shit? Geminis get sent straight to the bottom\!

### Deciding Setups

As mentioned before, each round instead of using six setups decided by the previous round’s three podium-sitters, would use ideally just one or two. Why? Well, effectively what played out in EM was often to this effect anyway. If a popular setup like CBA or TSIB was picked, then typically around 70% of the round’s games would be played on it, and others’ choices would be frequently ignored to the tune of having their number of plays countable on one hand, if there were any at all.

To ensure a greater variety of setups being played over time, I’ll outline my full proposal for deciding setups below:

\-12 or 24 setups to be picked per season, at one or two per round. No setup can be used more than once in a season.  
\-The top six players from the previous season each pick one/two setups to use in the next round.  
\-The player base then has the option to nominate vote on the remainder.  
\-A limit of 9/18 setups from last season can be retained for the next.  
\-In the option of using pairs of setups per round, no two setups that were paired in the last round can be paired in the next.  
\-The Competitive Council can choose any setups in slots that are yet to be filled by users not wishing to make their choices on setups they want for next season. I might suggest that the CC also chooses the inaugural rotation of setups for Season One.  
\-The order of the setups would be chosen by random draw, once choices have been finalised.

All this would be carried out over one week or perhaps two of down-time in between seasons, giving people time to consider their ideas for setups they’d like to see.

### Policy on Alts

Each player is permitted a maximum of two alts per round which are eligible to be classified in the round standings. These would be the first two accounts this player uses. I think we should try to disincentive players from starting a round with too many different alts and then pursuing the one that seems most promising. Players with only limited time to play games shouldn’t be put at an immediate disadvantage to ‘no-lifers’\!  
If more than one account places high enough to score championship points, then the lower ranked of the two account’s results will be discounted, and the places shift downward to accommodate, as in EM where a player could only win a trophy on a maximum of one account per round.

For the season standings, each player would have one entry that represents their results across all alts. Now you may say this means hydras and secret alts would be effectively banned… and well in my opinion tough\! Finding out at the end of 12 rounds that two entries were actually the same player and therefore reorder the table in a significant way would, in my opinion, and for lack of a better word, suck\! Making players be open about who they are I think is a small price to pay for avoiding this kind of situation which would cheapen the overall experience.  
Does that also make meta-abuse a bit easier for people who have a grudge against other players… I’ll concede that point, but grudging players is already against the rules, and this is the sort of thing that our keen eyed moderators will be looking at anyway in order to weed out abusive players.  
One’s meta-image in a setting over multiple games of mafia is an intractable and essential part of the game (if it wasn’t why would players create secret alts in the first place?), no matter how unfair it may feel, and any effort to try to rid ourselves of it entirely would be a futile one.

## Benefits

As I have seen discussed before, competing in rounds typically over nine or ten days that required players to play 45-50 games (excluding games left incomplete\!) can be quite the burden on players, both in terms of time and mental investment.  
A scenario that also often played out was a large majority of players dropping out as the round progressed as they realised they had no chance of placing in the top three. Rounds would typically attract a field of contestants numbering in the healthy three digits, but it wouldn’t be uncommon to see fewer than 20 play out their hearts, particularly in 10-day rounds. As such, it could sometimes be difficult to find open games to play in for some players wanting to finish their runs given the smaller number of players left active, especially in EM’s latter years and months.

Reducing this onus I think will have positive implications; many of the playerbase just don’t have the time to consistently devote 2+ hours of their time a day. A set limit of 28 hearts across eight days, and the added benefit of giving flexibility to players as to when they play by not enforcing any kind of heart decay.

Though individual rounds will be shorter and therefore more volatile, this will be offset by the seasonal structure to give a grander context to the rounds and a more prestigious accolade to compete for over a six month period. The longer breaks in between rounds would also help mitigate against mental burnout over the course of the season.

A wider variety of setups played should encourage the playerbase to try out and create their own setups for use in competition, and new entries would have the opportunity to join old favourites. More down-time between rounds would also help facilitate this, and help ‘red-hearts’ gain a bit of much needed relevancy.

## Drawbacks and Further Commentary

None obviously.

But really, I can understand a few potential criticisms. Having a seasonal system based over a much longer period than any individual round in EM could be felt as much more stressful than anything that came before it. In theory, the difference between a gold trophy and nothing at all could come down to a single game in over 300 at the end of weeks and weeks of playing; I acknowledge the stakes are much higher and the drama much sharper\!

Another thing that my system cannot accommodate for is setups containing third parties. I understand that in EM, particularly in the latter half of its history, that said setups are not so popular, but occasionally one containing a killer or fool would be used. I’d need to revamp the whole point-payout system to account for those\!

As far as mods are concerned, there would be an added onus on closing up all issues to a strict deadline, round by round. I *think* that six days should be adequate, but occasionally EM would take a bit longer to roll over rounds if there were serious questions about the integrity of multiple players’ runs during a round. If that occurred, in order to retain the regularity of the rounds starting and ending on certain days of the week, we'd have to add an extra week to that process. Would having a 13-day gap between rounds be ideal? Certainly not… but might that be inevitable?

I designed this system primarily because I thought it was more fun, and would provide more concrete recognition to a greater number of competitors. I can only speak for myself though, do you think this sounds more fun to you? I think that this is the most important aspect of designing competitions; if they aren’t fun to play, why should we expect anyone to play them? The purpose of determining who is the ‘best’ at chat-mafia is almost ancillary in this respect, though I think that this is still covered adequately by my format.

I welcome and cherish any feedback you guys might have on my proposal. I think we need to take some concrete steps forward on BM’s competition design though, and I think discussing this and potential amendments and voting might be a way forward.

Much love to all,  
*\~kirigiri*

[image1]: <data:image/png;base64,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>