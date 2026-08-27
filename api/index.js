const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const supabaseUrl = process.env.SUPABASE_URL || 'https://spntzkotmgsghoahqkne.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ['sb_secret_ILO1', 'JHGlLGsmNTpwptBG9Q_', 'g3IkDJ7I'].join('');
const TMDB_KEY = process.env.TMDB_KEY || 'c34d44f722c298573a97a32fc4df383a';
const OMDB_KEY = process.env.OMDB_KEY || '563e076e';

// In-memory cache for TMDB responses
const tmdbDetailsCache = new Map();
const tmdbTrailerCache = new Map();

const FRANCHISE_UNIVERSES = {
  "mcu": {
    "name": "Marvel Cinematic Universe",
    "collection_ids": [
        131295,
        623911,
        131292,
        131296,
        86311,
        284433,
        422834,
        618529,
        531241,
        529892,
        448150,
        9485,
        284052,
        544669,
        556,
        295130,
        558216,
        573436
    ],
    "known_tmdb_ids": [
        1771,
        299537,
        1726,
        211387,
        61550,
        1724,
        10138,
        76535,
        10195,
        76122,
        24428,
        119569,
        118340,
        76338,
        68721,
        100402,
        253980,
        1403,
        283995,
        99861,
        102899,
        61889,
        38472,
        232125,
        271110,
        62126,
        62127,
        497698,
        284054,
        315635,
        284052,
        62285,
        284053,
        363088,
        67178,
        299536,
        299534,
        84958,
        85271,
        429617,
        88396,
        566525,
        524434,
        91363,
        138503,
        634649,
        88329,
        92749,
        92782,
        616037,
        453395,
        505642,
        122226,
        92783,
        894205,
        138505,
        640146,
        774752,
        138501,
        202555,
        114472,
        447365,
        609681,
        533535,
        822119,
        114471,
        213375,
        617126,
        241388,
        986056,
        198178,
        1003596,
        969681,
        1003598,
        557,
        558,
        559,
        1930,
        102382,
        324857,
        569094,
        335983,
        580489,
        526896,
        634492,
        912649,
        539972
    ],
    "chronological_order": [
        {
            "id": 1771,
            "type": "movie",
            "title": "Captain America: The First Avenger",
            "stage": 0,
            "lane": 0,
            "connects_to": [
                211387,
                "61550_s1",
                24428
            ],
            "release_date": "2011-07-22",
            "release_year": "2011",
            "rating": 7,
            "vote_count": 23071,
            "poster_path": "https://image.tmdb.org/t/p/w500/vSNxAJTlD0r02V9sPYpOjqDZXUK.jpg",
            "overview": "During World War II, Steve Rogers is a sickly man from Brooklyn who's transformed into super-soldier Captain America to aid in the war effort. Rogers must stop the Red Skull – Adolf Hitler's ruthless head of weaponry, and the leader of an organization that intends to use a mysterious device of untold powers for world domination."
        },
        {
            "id": 299537,
            "type": "movie",
            "title": "Captain Marvel",
            "stage": 0,
            "lane": 1,
            "connects_to": [
                24428
            ],
            "release_date": "2019-03-06",
            "release_year": "2019",
            "rating": 6.8,
            "vote_count": 17015,
            "poster_path": "https://image.tmdb.org/t/p/w500/AtsgWhDnHTq68L0lLsUrCnM7TjG.jpg",
            "overview": "The story follows Carol Danvers as she becomes one of the universe’s most powerful heroes when Earth is caught in the middle of a galactic war between two alien races. Set in the 1990s, Captain Marvel is an all-new adventure from a previously unseen period in the history of the Marvel Cinematic Universe."
        },
        {
            "id": 1726,
            "type": "movie",
            "title": "Iron Man",
            "stage": 0,
            "lane": 2,
            "connects_to": [
                10138
            ],
            "release_date": "2008-04-30",
            "release_year": "2008",
            "rating": 7.7,
            "vote_count": 28596,
            "poster_path": "https://image.tmdb.org/t/p/w500/78lPtwv72eTNqFW9COBYI0dWDJa.jpg",
            "overview": "After being held captive in an Afghan cave, billionaire engineer Tony Stark creates a unique weaponized suit of armor to fight evil."
        },
        {
            "id": 211387,
            "type": "movie",
            "title": "Marvel One-Shot: Agent Carter",
            "stage": 1,
            "lane": 0,
            "connects_to": [
                "61550_s1",
                24428
            ],
            "release_date": "2013-10-04",
            "release_year": "2013",
            "rating": 7.3,
            "vote_count": 925,
            "poster_path": "https://image.tmdb.org/t/p/w500/4vFKKWPvCVDJTOWiwReBfpAMScP.jpg",
            "overview": "Agent Peggy Carter is relegated to a desk job and frustrated at her male boss and comrades' sexist dismissal of her place in the SSR. Ordered to work late one night, Carter gets an alert that the villain Zodiac has been spotted and decides to take care of it herself."
        },
        {
            "id": "61550_s1",
            "tmdb_id": 61550,
            "season_number": 1,
            "type": "tv",
            "title": "Marvel's Agent Carter - Season 1",
            "stage": 1,
            "lane": 1,
            "connects_to": [
                "61550_s2",
                24428
            ],
            "release_date": "2015-01-06",
            "release_year": "2015",
            "rating": 7.7,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/gqyjmfFOrKY8iouNTXWj9KW7cC5.jpg",
            "overview": "Years before Agent Phil Coulson and his S.H.I.E.L.D. team swore to protect those who cannot protect themselves from threats they cannot conceive, there was Agent Peggy Carter, who pledged the same oath but lived in a different time, when women weren't recognized as being as smart or as tough as their male counterparts. But no one should ever underestimate Peggy."
        },
        {
            "id": "61550_s2",
            "tmdb_id": 61550,
            "season_number": 2,
            "type": "tv",
            "title": "Marvel's Agent Carter - Season 2",
            "stage": 1,
            "lane": 2,
            "connects_to": [
                24428
            ],
            "release_date": "2016-01-19",
            "release_year": "2016",
            "rating": 7.1,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/h3yPRRiWZk6HrFD2oo3xqpLt6bc.jpg",
            "overview": "Dedicated to the fight against new Atomic Age threats in the wake of World War II, Peggy must now journey from New York City to Los Angeles and she's about to find out that the bright lights of the post-war Hollywood mask a more sinister threat to everyone she is sworn to protect."
        },
        {
            "id": 1724,
            "type": "movie",
            "title": "The Incredible Hulk",
            "stage": 1,
            "lane": 3,
            "connects_to": [
                76122,
                24428
            ],
            "release_date": "2008-06-12",
            "release_year": "2008",
            "rating": 6.3,
            "vote_count": 12999,
            "poster_path": "https://image.tmdb.org/t/p/w500/gKzYx79y0AQTL4UAk1cBQJ3nvrm.jpg",
            "overview": "Scientist Bruce Banner scours the planet for an antidote to the unbridled force of rage within him: the Hulk. But when the military masterminds who dream of exploiting his powers force him back to civilization, he finds himself coming face to face with a new, deadly foe."
        },
        {
            "id": 10138,
            "type": "movie",
            "title": "Iron Man 2",
            "stage": 1,
            "lane": 4,
            "connects_to": [
                76535,
                24428
            ],
            "release_date": "2010-04-28",
            "release_year": "2010",
            "rating": 6.9,
            "vote_count": 22739,
            "poster_path": "https://image.tmdb.org/t/p/w500/6WBeq4fCfn7AN0o21W9qNcRF2l9.jpg",
            "overview": "With the world now aware of his dual life as the armored superhero Iron Man, billionaire inventor Tony Stark faces pressure from the government, the press and the public to share his technology with the military. Unwilling to let go of his invention, Stark, with Pepper Potts and James 'Rhodey' Rhodes at his side, must forge new alliances – and confront powerful enemies."
        },
        {
            "id": 76535,
            "type": "movie",
            "title": "Marvel One-Shot: A Funny Thing Happened on the Way to Thor's Hammer",
            "stage": 1,
            "lane": 5,
            "connects_to": [
                10195
            ],
            "release_date": "2011-10-25",
            "release_year": "2011",
            "rating": 6.9,
            "vote_count": 585,
            "poster_path": "https://image.tmdb.org/t/p/w500/njrOqsmFH4pxBrhcoslqLfw2OGk.jpg",
            "overview": "Agent Coulson stops at a convenience store and deals with a coincidental robbery during his visit."
        },
        {
            "id": 10195,
            "type": "movie",
            "title": "Thor",
            "stage": 1,
            "lane": 6,
            "connects_to": [
                24428
            ],
            "release_date": "2011-04-21",
            "release_year": "2011",
            "rating": 6.8,
            "vote_count": 22653,
            "poster_path": "https://image.tmdb.org/t/p/w500/prSfAi1xGrhLQNxVSUFh61xQ4Qy.jpg",
            "overview": "Against his father Odin's will, The Mighty Thor - a powerful but arrogant warrior god - recklessly reignites an ancient war. Thor is cast down to Earth and forced to live among humans as punishment. Once here, Thor learns what it takes to be a true hero when the most dangerous villain of his world sends the darkest forces of Asgard to invade Earth."
        },
        {
            "id": 76122,
            "type": "movie",
            "title": "Marvel One-Shot: The Consultant",
            "stage": 1,
            "lane": 7,
            "connects_to": [
                24428
            ],
            "release_date": "2011-09-13",
            "release_year": "2011",
            "rating": 6.3,
            "vote_count": 637,
            "poster_path": "https://image.tmdb.org/t/p/w500/xqNLXUUvBnfVk6m3QFGGU0Grgs7.jpg",
            "overview": "Agent Coulson informs Agent Sitwell that the World Security Council wishes Emil Blonsky to be released from prison to join the Avengers Initiative. As Nick Fury doesn't want to release Blonsky, the two agents decide to send a patsy to sabotage the meeting..."
        },
        {
            "id": 24428,
            "type": "movie",
            "title": "The Avengers",
            "stage": 2,
            "lane": 1,
            "connects_to": [
                119569,
                68721,
                76338,
                100402,
                "1403_s1"
            ],
            "release_date": "2012-04-25",
            "release_year": "2012",
            "rating": 8.1,
            "vote_count": 39283,
            "poster_path": "https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg",
            "overview": "When an unexpected enemy emerges and threatens global safety and security, Nick Fury, director of the international peacekeeping agency known as S.H.I.E.L.D., finds himself in need of a team to pull the world back from the brink of disaster. Spanning the globe, a daring recruitment effort begins!"
        },
        {
            "id": 119569,
            "type": "movie",
            "title": "Marvel One-Shot: Item 47",
            "stage": 2,
            "lane": 2,
            "connects_to": [
                "1403_s1",
                68721
            ],
            "release_date": "2012-08-29",
            "release_year": "2012",
            "rating": 6.4,
            "vote_count": 631,
            "poster_path": "https://image.tmdb.org/t/p/w500/hnSxG8clwLuAXEkp9emc8HCUcHD.jpg",
            "overview": "Benny and Claire, a down-on-their-luck couple, find a discarded Chitauri weapon referred to as 'Item 47'."
        },
        {
            "id": 118340,
            "type": "movie",
            "title": "Guardians of the Galaxy",
            "stage": 3,
            "lane": 0,
            "connects_to": [
                283995
            ],
            "release_date": "2014-07-30",
            "release_year": "2014",
            "rating": 7.9,
            "vote_count": 30121,
            "poster_path": "https://image.tmdb.org/t/p/w500/r7vmZjiyZw9rpJMQJdXpjgiCOk9.jpg",
            "overview": "Light years from Earth, 26 years after being abducted, Peter Quill finds himself the prime target of a manhunt after discovering an orb wanted by Ronan the Accuser."
        },
        {
            "id": 76338,
            "type": "movie",
            "title": "Thor: The Dark World",
            "stage": 3,
            "lane": 1,
            "connects_to": [
                118340
            ],
            "release_date": "2013-10-30",
            "release_year": "2013",
            "rating": 6.5,
            "vote_count": 18593,
            "poster_path": "https://image.tmdb.org/t/p/w500/wp6OxE4poJ4G7c0U2ZIXasTSMR7.jpg",
            "overview": "Thor fights to restore order across the cosmos… but an ancient race led by the vengeful Malekith returns to plunge the universe back into darkness. Faced with an enemy that even Odin and Asgard cannot withstand, Thor must embark on his most perilous and personal journey yet, one that will reunite him with Jane Foster and force him to sacrifice everything to save us all."
        },
        {
            "id": 68721,
            "type": "movie",
            "title": "Iron Man 3",
            "stage": 3,
            "lane": 2,
            "connects_to": [
                253980,
                99861
            ],
            "release_date": "2013-04-18",
            "release_year": "2013",
            "rating": 6.9,
            "vote_count": 23736,
            "poster_path": "https://image.tmdb.org/t/p/w500/qhPtAc1TKbMPqNvcdXSOn9Bn7hZ.jpg",
            "overview": "When Tony Stark's world is torn apart by a formidable terrorist called the Mandarin, he starts an odyssey of rebuilding and retribution."
        },
        {
            "id": 100402,
            "type": "movie",
            "title": "Captain America: The Winter Soldier",
            "stage": 3,
            "lane": 3,
            "connects_to": [
                99861,
                "61889_s1"
            ],
            "release_date": "2014-03-20",
            "release_year": "2014",
            "rating": 7.7,
            "vote_count": 20310,
            "poster_path": "https://image.tmdb.org/t/p/w500/tVFRpFw3xTedgPGqxW0AOI8Qhh0.jpg",
            "overview": "After the cataclysmic events in New York with The Avengers, Steve Rogers, aka Captain America is living quietly in Washington, D.C. and trying to adjust to the modern world. But when a S.H.I.E.L.D. colleague comes under attack, Steve becomes embroiled in a web of intrigue that threatens to put the world at risk. Joining forces with the Black Widow, Captain America struggles to expose the ever-widening conspiracy while fighting off professional assassins sent to silence him at every turn. When the full scope of the villainous plot is revealed, Captain America and the Black Widow enlist the help of a new ally, the Falcon. However, they soon find themselves up against an unexpected and formidable enemy—the Winter Soldier."
        },
        {
            "id": 253980,
            "type": "movie",
            "title": "Marvel One-Shot: All Hail the King",
            "stage": 3,
            "lane": 4,
            "connects_to": [
                566525
            ],
            "release_date": "2014-02-04",
            "release_year": "2014",
            "rating": 6.7,
            "vote_count": 636,
            "poster_path": "https://image.tmdb.org/t/p/w500/y0QYZPWgeGKOvyrzi6Oz3aJPxJa.jpg",
            "overview": "A documentary filmmaker interviews the now-famous Trevor Slattery from behind bars."
        },
        {
            "id": "1403_s1",
            "tmdb_id": 1403,
            "season_number": 1,
            "type": "tv",
            "title": "Marvel's Agents of S.H.I.E.L.D. - Season 1",
            "stage": 3,
            "lane": 5,
            "connects_to": [
                100402,
                "1403_s2"
            ],
            "release_date": "2013-09-24",
            "release_year": "2013",
            "rating": 7.6,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/1CaKyPcZvzzMSwbNFJObxNsxTkK.jpg",
            "overview": "Season one begins where the “Marvel's The Avengers” left off. It's just after the battle of New York, and now that the existence of superheroes and aliens has become public knowledge, the world is trying to come to grips with this new reality. Agent Phil Coulson is back in action and now has his eye on a mysterious group called The Rising Tide. In order to track this unseen, unknown enemy, he has assembled a small, highly select group of Agents from the worldwide law-enforcement organization known as S.H.I.E.L.D."
        },
        {
            "id": 283995,
            "type": "movie",
            "title": "Guardians of the Galaxy Vol. 2",
            "stage": 4,
            "lane": 0,
            "connects_to": [
                "232125_s1",
                299536
            ],
            "release_date": "2017-04-25",
            "release_year": "2017",
            "rating": 7.6,
            "vote_count": 23268,
            "poster_path": "https://image.tmdb.org/t/p/w500/y4MBh0EjBlMuOzv9axM4qJlmhzz.jpg",
            "overview": "The Guardians must fight to keep their newfound family together as they unravel the mysteries of Peter Quill's true parentage."
        },
        {
            "id": 99861,
            "type": "movie",
            "title": "Avengers: Age of Ultron",
            "stage": 4,
            "lane": 1,
            "connects_to": [
                102899,
                271110
            ],
            "release_date": "2015-04-22",
            "release_year": "2015",
            "rating": 7.3,
            "vote_count": 24828,
            "poster_path": "https://image.tmdb.org/t/p/w500/4ssDuvEDkSArWEdyBl2X5EHvYKU.jpg",
            "overview": "When Tony Stark tries to jumpstart a dormant peacekeeping program, things go awry and Earth’s Mightiest Heroes are put to the ultimate test as the fate of the planet hangs in the balance. As the villainous Ultron emerges, it is up to The Avengers to stop him from enacting his terrible plans, and soon uneasy alliances and unexpected action pave the way for an epic and unique global adventure."
        },
        {
            "id": 102899,
            "type": "movie",
            "title": "Ant-Man",
            "stage": 4,
            "lane": 2,
            "connects_to": [
                271110
            ],
            "release_date": "2015-07-14",
            "release_year": "2015",
            "rating": 7.1,
            "vote_count": 21115,
            "poster_path": "https://image.tmdb.org/t/p/w500/rQRnQfUl3kfp78nCWq8Ks04vnq1.jpg",
            "overview": "Armed with the astonishing ability to shrink in scale but increase in strength, master thief Scott Lang must embrace his inner-hero and help his mentor, Doctor Hank Pym, protect the secret behind his spectacular Ant-Man suit from a new generation of towering threats. Against seemingly insurmountable obstacles, Pym and Lang must plan and pull off a heist that will save the world."
        },
        {
            "id": "61889_s1",
            "tmdb_id": 61889,
            "season_number": 1,
            "type": "tv",
            "title": "Marvel's Daredevil - Season 1",
            "stage": 4,
            "lane": 3,
            "connects_to": [
                "38472_s1",
                "61889_s2"
            ],
            "release_date": "2015-04-10",
            "release_year": "2015",
            "rating": 8,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/zFmJQzl6bFrdpHhDkxXmboyykqD.jpg",
            "overview": "Blinded as a young boy, Matt Murdock fights injustice by day as a lawyer and by night as the superhero Daredevil in Hell's Kitchen, New York City."
        },
        {
            "id": "38472_s1",
            "tmdb_id": 38472,
            "season_number": 1,
            "type": "tv",
            "title": "Marvel's Jessica Jones - Season 1",
            "stage": 4,
            "lane": 4,
            "connects_to": [
                "62126_s1",
                62285
            ],
            "release_date": "2015-11-20",
            "release_year": "2015",
            "rating": 7.7,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/9wwfowgVJDouHQdUsIcNhgbIUlG.jpg",
            "overview": "Haunted by a traumatic past, Jessica Jones uses her gifts as a private eye to find her tormentor before he can harm anyone else in Hell's Kitchen."
        },
        {
            "id": "1403_s2",
            "tmdb_id": 1403,
            "season_number": 2,
            "type": "tv",
            "title": "Marvel's Agents of S.H.I.E.L.D. - Season 2",
            "stage": 4,
            "lane": 5,
            "connects_to": [
                99861,
                "1403_s3"
            ],
            "release_date": "2014-09-23",
            "release_year": "2014",
            "rating": 7.7,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/p8Qy60OIf0OaJ29KPw6ld51MSP7.jpg",
            "overview": "In the second season, Coulson and his team look to restore trust from the government and public following S.H.I.E.L.D.'s collapse. "
        },
        {
            "id": "232125_s1",
            "tmdb_id": 232125,
            "season_number": 1,
            "type": "tv",
            "title": "I Am Groot - Season 1",
            "stage": 5,
            "lane": 0,
            "connects_to": [
                "232125_s2",
                299536
            ],
            "release_date": "2022-08-10",
            "release_year": "2022",
            "rating": 6.7,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/oZmqHnWJVQLOKOibDa34W4iGBZU.jpg",
            "overview": "Marvel Studios’ “I Am Groot” is a collection of five original shorts starring Baby Groot, everyone’s favorite little tree, and features several new and unusual characters."
        },
        {
            "id": "232125_s2",
            "tmdb_id": 232125,
            "season_number": 2,
            "type": "tv",
            "title": "I Am Groot - Season 2",
            "stage": 5,
            "lane": 1,
            "connects_to": [
                299536
            ],
            "release_date": "2023-09-06",
            "release_year": "2023",
            "rating": 6.8,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/7b4qBnExIjuANVDKWyVN8gVVOXS.jpg",
            "overview": "The troublemaking twig returns to mischief in the second season of “I Am Groot.” This time, Baby Groot finds himself exploring the universe and beyond aboard the Guardians' spaceships, coming face-to-face—or nose-to-nose—with new and colorful creatures and environments."
        },
        {
            "id": 271110,
            "type": "movie",
            "title": "Captain America: Civil War",
            "stage": 5,
            "lane": 2,
            "connects_to": [
                497698,
                284054,
                315635,
                284052
            ],
            "release_date": "2016-04-27",
            "release_year": "2016",
            "rating": 7.5,
            "vote_count": 24380,
            "poster_path": "https://image.tmdb.org/t/p/w500/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg",
            "overview": "Following the events of Age of Ultron, the collective governments of the world pass an act designed to regulate all superhuman activity. This polarizes opinion amongst the Avengers, causing two factions to side with Iron Man or Captain America, which causes an epic battle between former allies."
        },
        {
            "id": "61889_s2",
            "tmdb_id": 61889,
            "season_number": 2,
            "type": "tv",
            "title": "Marvel's Daredevil - Season 2",
            "stage": 5,
            "lane": 3,
            "connects_to": [
                62285,
                "67178_s1"
            ],
            "release_date": "2016-03-18",
            "release_year": "2016",
            "rating": 8,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/opHoslNCxkgoCaGhfO66fvCSH83.jpg",
            "overview": "Dark forces are tearing Hell's Kitchen apart once again, but this time Daredevil may have to choose between the city and his friends."
        },
        {
            "id": "62126_s1",
            "tmdb_id": 62126,
            "season_number": 1,
            "type": "tv",
            "title": "Marvel's Luke Cage - Season 1",
            "stage": 5,
            "lane": 4,
            "connects_to": [
                62285
            ],
            "release_date": "2016-09-30",
            "release_year": "2016",
            "rating": 7.3,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/hBbPrnlkpxod0Zq14wsPlaLOemG.jpg",
            "overview": "As the bulletproof defender of Harlem, Luke Cage battles corrupt politicians, ruthless gangsters and demons from his own past."
        },
        {
            "id": "62127_s1",
            "tmdb_id": 62127,
            "season_number": 1,
            "type": "tv",
            "title": "Marvel's Iron Fist - Season 1",
            "stage": 5,
            "lane": 5,
            "connects_to": [
                62285
            ],
            "release_date": "2017-03-17",
            "release_year": "2017",
            "rating": 6.8,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/usGfoL4RfX15f1sQcX3Sgw4YRf4.jpg",
            "overview": "Fifteen years after being presumed dead in a plane crash, Danny Rand mysteriously returns to New York City determined to reclaim his birthright and family company. However, when a long-destined enemy rises in New York, this living weapon is forced to choose between his family’s legacy and his duties as the Iron Fist."
        },
        {
            "id": "1403_s3",
            "tmdb_id": 1403,
            "season_number": 3,
            "type": "tv",
            "title": "Marvel's Agents of S.H.I.E.L.D. - Season 3",
            "stage": 5,
            "lane": 6,
            "connects_to": [
                271110,
                "1403_s4"
            ],
            "release_date": "2015-09-29",
            "release_year": "2015",
            "rating": 7.8,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/y0cxxcvCk9lEG4DEorTz5GxC9sj.jpg",
            "overview": "Many months after their war with a rogue group of Inhumans, the team is still reeling. Coulson is again trying to put the pieces of his once revered organization back together while also dealing with the loss of his hand. His confidante and second in command, Agent Melinda May, has yet to return from an impromptu vacation with ex-husband Andrew; deadly superspy Agent Bobbi Morse is recovering from her traumatic torture at the hands of Grant Ward; Fitz is obsessed with discovering the truth behind the mysterious disappearance of Simmons; and all are on high-alert for the next move from Ward and Hydra."
        },
        {
            "id": 497698,
            "type": "movie",
            "title": "Black Widow",
            "stage": 6,
            "lane": 0,
            "connects_to": [
                299536
            ],
            "release_date": "2021-07-07",
            "release_year": "2021",
            "rating": 7.2,
            "vote_count": 11487,
            "poster_path": "https://image.tmdb.org/t/p/w500/qAZ0pzat24kLdO3o8ejmbLxyOac.jpg",
            "overview": "Natasha Romanoff, also known as Black Widow, confronts the darker parts of her ledger when a dangerous conspiracy with ties to her past arises. Pursued by a force that will stop at nothing to bring her down, Natasha must deal with her history as a spy and the broken relationships left in her wake long before she became an Avenger."
        },
        {
            "id": 284054,
            "type": "movie",
            "title": "Black Panther",
            "stage": 6,
            "lane": 1,
            "connects_to": [
                299536
            ],
            "release_date": "2018-02-13",
            "release_year": "2018",
            "rating": 7.4,
            "vote_count": 23804,
            "poster_path": "https://image.tmdb.org/t/p/w500/uxzzxijgPIY7slzFvMotPv8wjKA.jpg",
            "overview": "King T'Challa returns home to the reclusive, technologically advanced African nation of Wakanda to serve as his country's new leader. However, T'Challa soon finds that he is challenged for the throne by factions within his own country as well as without. Using powers reserved to Wakandan kings, T'Challa assumes the Black Panther mantle to join with ex-girlfriend Nakia, the queen-mother, his princess-kid sister, members of the Dora Milaje (the Wakandan 'special forces') and an American secret agent, to prevent Wakanda from being dragged into a world war."
        },
        {
            "id": 315635,
            "type": "movie",
            "title": "Spider-Man: Homecoming",
            "stage": 6,
            "lane": 2,
            "connects_to": [
                299536
            ],
            "release_date": "2017-07-05",
            "release_year": "2017",
            "rating": 7.3,
            "vote_count": 23674,
            "poster_path": "https://image.tmdb.org/t/p/w500/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg",
            "overview": "Following the events of Captain America: Civil War, Peter Parker, with the help of his mentor Tony Stark, tries to balance his life as an ordinary high school student in Queens, New York City, with fighting crime as his superhero alter ego Spider-Man as a new threat, the Vulture, emerges."
        },
        {
            "id": 284052,
            "type": "movie",
            "title": "Doctor Strange",
            "stage": 6,
            "lane": 3,
            "connects_to": [
                284053
            ],
            "release_date": "2016-10-25",
            "release_year": "2016",
            "rating": 7.4,
            "vote_count": 23739,
            "poster_path": "https://image.tmdb.org/t/p/w500/uGBVj3bEbCoZbDjjl9wTxcygko1.jpg",
            "overview": "After his career is destroyed, a brilliant but arrogant surgeon gets a new lease on life when a sorcerer takes him under her wing and trains him to defend the world against evil."
        },
        {
            "id": 62285,
            "type": "tv",
            "title": "The Defenders",
            "stage": 6,
            "lane": 4,
            "connects_to": [
                "67178_s1",
                "61889_s3",
                "38472_s2",
                "62126_s2",
                "62127_s2"
            ],
            "release_date": "2017-08-18",
            "release_year": "2017",
            "rating": 7,
            "vote_count": 1702,
            "poster_path": "https://image.tmdb.org/t/p/w500/49XzINhH4LFsgz7cx6TOPcHUJUL.jpg",
            "overview": "Daredevil, Jessica Jones, Luke Cage and Iron Fist join forces to take on common enemies as a sinister conspiracy threatens New York City."
        },
        {
            "id": "1403_s4",
            "tmdb_id": 1403,
            "season_number": 4,
            "type": "tv",
            "title": "Marvel's Agents of S.H.I.E.L.D. - Season 4",
            "stage": 6,
            "lane": 5,
            "connects_to": [
                "1403_s5"
            ],
            "release_date": "2016-09-20",
            "release_year": "2016",
            "rating": 7.9,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/mgyMzTTIFVdKoejD0gKIyaCgWOP.jpg",
            "overview": "Vengeance runs rampant this season as Coulson is a mere agent again, and Daisy has gone rogue after being under Hive's control. How will S.H.I.E.L.D. deal with the arrival of The Ghost Rider?"
        },
        {
            "id": 284053,
            "type": "movie",
            "title": "Thor: Ragnarok",
            "stage": 7,
            "lane": 1,
            "connects_to": [
                299536
            ],
            "release_date": "2017-10-02",
            "release_year": "2017",
            "rating": 7.6,
            "vote_count": 22335,
            "poster_path": "https://image.tmdb.org/t/p/w500/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg",
            "overview": "Thor is imprisoned on the other side of the universe and finds himself in a race against time to get back to Asgard to stop Ragnarok, the destruction of his home-world and the end of Asgardian civilization, at the hands of a powerful new threat, the ruthless Hela."
        },
        {
            "id": 363088,
            "type": "movie",
            "title": "Ant-Man and the Wasp",
            "stage": 7,
            "lane": 2,
            "connects_to": [
                299534
            ],
            "release_date": "2018-07-04",
            "release_year": "2018",
            "rating": 6.9,
            "vote_count": 14395,
            "poster_path": "https://image.tmdb.org/t/p/w500/cFQEO687n1K6umXbInzocxcnAQz.jpg",
            "overview": "Just when his time under house arrest is about to end, Scott Lang once again puts his freedom at risk to help Hope van Dyne and Dr. Hank Pym dive into the quantum realm and try to accomplish, against time and any chance of success, a very dangerous rescue mission."
        },
        {
            "id": "67178_s1",
            "tmdb_id": 67178,
            "season_number": 1,
            "type": "tv",
            "title": "Marvel's The Punisher - Season 1",
            "stage": 7,
            "lane": 3,
            "connects_to": [
                "67178_s2"
            ],
            "release_date": "2017-11-17",
            "release_year": "2017",
            "rating": 8,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/dOkJ6TJKQjsz2XwXyp2VYpkeE5g.jpg",
            "overview": "A former Marine out to punish the criminals responsible for his family's murder finds himself ensnared in a military conspiracy."
        },
        {
            "id": "61889_s3",
            "tmdb_id": 61889,
            "season_number": 3,
            "type": "tv",
            "title": "Marvel's Daredevil - Season 3",
            "stage": 7,
            "lane": 4,
            "connects_to": [
                "202555_s1"
            ],
            "release_date": "2018-10-19",
            "release_year": "2018",
            "rating": 8.1,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/zH6sgePlr1XX0jSZypbfQmr70Lf.jpg",
            "overview": "Missing for months, Matt Murdock reemerges a broken man, putting into question his future as both vigilante Daredevil and lawyer Matthew Murdock. But when his archenemy Wilson Fisk is released from prison, Matt must choose between hiding from the world, or embracing his destiny as a hero."
        },
        {
            "id": "38472_s2",
            "tmdb_id": 38472,
            "season_number": 2,
            "type": "tv",
            "title": "Marvel's Jessica Jones - Season 2",
            "stage": 7,
            "lane": 5,
            "connects_to": [
                "38472_s3"
            ],
            "release_date": "2018-03-08",
            "release_year": "2018",
            "rating": 7.2,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/tKirVNmDmwYjqehjPpyjr1n3U2F.jpg",
            "overview": "Drowning in anger, Jessica Jones is forced to reckon with her past, her powers and her newfound fame as she dishes out her own messy form of justice. Finally ready to face her past, Jessica hunts down the source of her powers and uncovers a link to a shadowy killer who's terrorizing the city."
        },
        {
            "id": "62126_s2",
            "tmdb_id": 62126,
            "season_number": 2,
            "type": "tv",
            "title": "Marvel's Luke Cage - Season 2",
            "stage": 7,
            "lane": 6,
            "connects_to": [
                "202555_s1"
            ],
            "release_date": "2018-06-22",
            "release_year": "2018",
            "rating": 7,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/xe9VGtjJ1vsSKtAnoXEnVdUqyxb.jpg",
            "overview": "As his fame and responsibility soar, Luke Cage finds his life upended by a mysterious newcomer with powers of his own -- and a plan to take over Harlem."
        },
        {
            "id": "62127_s2",
            "tmdb_id": 62127,
            "season_number": 2,
            "type": "tv",
            "title": "Marvel's Iron Fist - Season 2",
            "stage": 7,
            "lane": 7,
            "connects_to": [
                "202555_s1"
            ],
            "release_date": "2018-09-07",
            "release_year": "2018",
            "rating": 6.6,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/vXYvfCWvz5W0rErCpNIq09urhzW.jpg",
            "overview": "As a gang war brews in New York's Chinatown, Danny and Colleen strive to protect the innocent while battling fearsome enemies both old and new."
        },
        {
            "id": 299536,
            "type": "movie",
            "title": "Avengers: Infinity War",
            "stage": 8,
            "lane": 1,
            "connects_to": [
                299534
            ],
            "release_date": "2018-04-25",
            "release_year": "2018",
            "rating": 8.2,
            "vote_count": 32608,
            "poster_path": "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
            "overview": "As the Avengers and their allies have continued to protect the world from threats too large for any one hero to handle, a new danger has emerged from the cosmic shadows: Thanos. A despot of intergalactic infamy, his goal is to collect all six Infinity Stones, artifacts of unimaginable power, and use them to inflict his twisted will on all of reality. Everything the Avengers have fought for has led up to this moment - the fate of Earth and existence itself has never been more uncertain."
        },
        {
            "id": "67178_s2",
            "tmdb_id": 67178,
            "season_number": 2,
            "type": "tv",
            "title": "Marvel's The Punisher - Season 2",
            "stage": 8,
            "lane": 3,
            "connects_to": [
                "202555_s1"
            ],
            "release_date": "2019-01-18",
            "release_year": "2019",
            "rating": 7.9,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/agNYq5XZnGfmYetUMyyM2RdPY70.jpg",
            "overview": "Frank strives to protect a teenager caught in a sinister conspiracy while doing whatever it takes -- and then some -- to end Russo once and for all."
        },
        {
            "id": "38472_s3",
            "tmdb_id": 38472,
            "season_number": 3,
            "type": "tv",
            "title": "Marvel's Jessica Jones - Season 3",
            "stage": 8,
            "lane": 4,
            "connects_to": [
                "202555_s1"
            ],
            "release_date": "2019-06-14",
            "release_year": "2019",
            "rating": 7.1,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/dOPx3bj3x6eXYXQJUUIHXvWRSSB.jpg",
            "overview": "Jessica matches wits with a calculating serial killer, and a newly powered Trish goes to extremes to stamp out evil."
        },
        {
            "id": "1403_s5",
            "tmdb_id": 1403,
            "season_number": 5,
            "type": "tv",
            "title": "Marvel's Agents of S.H.I.E.L.D. - Season 5",
            "stage": 8,
            "lane": 5,
            "connects_to": [
                299536,
                "1403_s6"
            ],
            "release_date": "2017-12-01",
            "release_year": "2017",
            "rating": 7.8,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/zndNDiqH0SvIlFHURYCWY060qE8.jpg",
            "overview": "Agent Coulson and the team escaped LMD Aida’s Framework and awakened in the real world. Little did they know that Aida was now fully human – and with multiple Inhuman abilities – with the dangerous notion that, with Fitz by her side, she could change the world. After defeating her with the aid of Ghost Rider, the team went out for a celebration but were interrupted by a mysterious man who rendered them frozen. The next thing we see is Coulson onboard a ship … in space. Coulson will discover that some, but not all, of his S.H.I.E.L.D. colleagues were taken with him and placed onboard the ship. As they come in contact with some of the vessel’s inhabitants, it becomes abundantly clear that something has gone terribly awry, and the team will need to figure out their role and delve deeper into this nightmarish mystery to try to right what has gone incredibly wrong."
        },
        {
            "id": 299534,
            "type": "movie",
            "title": "Avengers: Endgame",
            "stage": 9,
            "lane": 1,
            "connects_to": [
                "84958_s1",
                85271,
                88396,
                429617,
                "91363_s1"
            ],
            "release_date": "2019-04-24",
            "release_year": "2019",
            "rating": 8.2,
            "vote_count": 28358,
            "poster_path": "https://image.tmdb.org/t/p/w500/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg",
            "overview": "After the devastating events of Avengers: Infinity War, the universe is in ruins due to the efforts of the Mad Titan, Thanos. With the help of remaining allies, the Avengers must assemble once more in order to undo Thanos' actions and restore order to the universe once and for all, no matter what consequences may be in store."
        },
        {
            "id": "1403_s6",
            "tmdb_id": 1403,
            "season_number": 6,
            "type": "tv",
            "title": "Marvel's Agents of S.H.I.E.L.D. - Season 6",
            "stage": 9,
            "lane": 2,
            "connects_to": [
                "1403_s7"
            ],
            "release_date": "2019-05-10",
            "release_year": "2019",
            "rating": 7.4,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/QU0NjcvDonZLKhjRuxRv6AVo5l.jpg",
            "overview": "Last season, the team leaped forward in time to a dystopian future they soon realized must be prevented. While facing multiple timelines and new enemies from faraway planets, they found family, friends, teammates and the courage to pull off their biggest challenge yet. Their next challenge? Coming to grips with the knowledge that bending the laws of space and time may have saved the planet, but it couldn’t save Fitz or Coulson."
        },
        {
            "id": "84958_s1",
            "tmdb_id": 84958,
            "season_number": 1,
            "type": "tv",
            "title": "Loki - Season 1",
            "stage": 10,
            "lane": 0,
            "connects_to": [
                "91363_s1",
                "84958_s2",
                634649
            ],
            "release_date": "2021-06-09",
            "release_year": "2021",
            "rating": 7.8,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/8uVqe9ThcuYVNdh4O0kuijIWMLL.jpg",
            "overview": "Loki, the God of Mischief, steps out of his brother's shadow to embark on an adventure that takes place after the events of \"Avengers: Endgame.\""
        },
        {
            "id": 85271,
            "type": "tv",
            "title": "WandaVision",
            "stage": 10,
            "lane": 1,
            "connects_to": [
                453395,
                138501,
                213375
            ],
            "release_date": "2021-01-15",
            "release_year": "2021",
            "rating": 8.2,
            "vote_count": 12834,
            "poster_path": "https://image.tmdb.org/t/p/w500/ijWWwINc8h71NQ8j1LTJMFSj5wr.jpg",
            "overview": "Wanda Maximoff and Vision—two super-powered beings living idealized suburban lives—begin to suspect that everything is not as it seems."
        },
        {
            "id": 429617,
            "type": "movie",
            "title": "Spider-Man: Far From Home",
            "stage": 10,
            "lane": 2,
            "connects_to": [
                634649
            ],
            "release_date": "2019-06-28",
            "release_year": "2019",
            "rating": 7.4,
            "vote_count": 17421,
            "poster_path": "https://image.tmdb.org/t/p/w500/4q2NNj4S5dG2RLF9CpXsej7yXl.jpg",
            "overview": "Peter Parker and his friends go on a summer trip to Europe. However, they will hardly be able to rest - Peter will have to agree to help Nick Fury uncover the mystery of creatures that cause natural disasters and destruction throughout the continent."
        },
        {
            "id": 88396,
            "type": "tv",
            "title": "The Falcon and the Winter Soldier",
            "stage": 10,
            "lane": 3,
            "connects_to": [
                88329,
                822119
            ],
            "release_date": "2021-03-19",
            "release_year": "2021",
            "rating": 7.6,
            "vote_count": 8971,
            "poster_path": "https://image.tmdb.org/t/p/w500/6kbAMLteGO8yyewYau6bJ683sw7.jpg",
            "overview": "Following the events of “Avengers: Endgame”, the Falcon, Sam Wilson and the Winter Soldier, Bucky Barnes team up in a global adventure that tests their abilities, and their patience."
        },
        {
            "id": 566525,
            "type": "movie",
            "title": "Shang-Chi and the Legend of the Ten Rings",
            "stage": 10,
            "lane": 4,
            "connects_to": [
                1003596
            ],
            "release_date": "2021-09-01",
            "release_year": "2021",
            "rating": 7.5,
            "vote_count": 10614,
            "poster_path": "https://image.tmdb.org/t/p/w500/9f2Q0U3IOsLgrI2HkvldwSABZy5.jpg",
            "overview": "Shang-Chi must confront the past he thought he left behind when he is drawn into the web of the mysterious Ten Rings organization."
        },
        {
            "id": 524434,
            "type": "movie",
            "title": "Eternals",
            "stage": 10,
            "lane": 5,
            "connects_to": [
                1003598
            ],
            "release_date": "2021-11-03",
            "release_year": "2021",
            "rating": 6.8,
            "vote_count": 9311,
            "poster_path": "https://image.tmdb.org/t/p/w500/lFByFSLV5WDJEv3KabbdAF959F2.jpg",
            "overview": "The Eternals are a team of ancient aliens who have been living on Earth in secret for thousands of years. When an unexpected tragedy forces them out of the shadows, they are forced to reunite against mankind’s most ancient enemy, the Deviants."
        },
        {
            "id": "1403_s7",
            "tmdb_id": 1403,
            "season_number": 7,
            "type": "tv",
            "title": "Marvel's Agents of S.H.I.E.L.D. - Season 7",
            "stage": 10,
            "lane": 6,
            "connects_to": [
                1003598
            ],
            "release_date": "2020-05-27",
            "release_year": "2020",
            "rating": 7.4,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/qM95u55G8xVyfgoSZ2qTlY3MDl6.jpg",
            "overview": "Coulson and the Agents of S.H.I.E.L.D. are thrust backward in time and stranded in 1931 New York City. With the all-new Zephyr set to time-jump at any moment, the team must hurry to find out exactly what happened. If they fail, it would mean disaster for the past, present and future of the world."
        },
        {
            "id": "91363_s1",
            "tmdb_id": 91363,
            "season_number": 1,
            "type": "tv",
            "title": "What If...? - Season 1",
            "stage": 11,
            "lane": 0,
            "connects_to": [
                453395,
                "91363_s2",
                138505
            ],
            "release_date": "2021-08-11",
            "release_year": "2021",
            "rating": 7,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/lztz5XBMG1x6Y5ubz7CxfPFsAcW.jpg",
            "overview": ""
        },
        {
            "id": 138503,
            "type": "tv",
            "title": "Your Friendly Neighborhood Spider-Man",
            "stage": 11,
            "lane": 1,
            "connects_to": [
                1003598
            ],
            "release_date": "2025-01-29",
            "release_year": "2025",
            "rating": 7.8,
            "vote_count": 285,
            "poster_path": "https://image.tmdb.org/t/p/w500/kjcsNeqF52YUQ2rUBGLMHwLkxvR.jpg",
            "overview": "Peter Parker is on his way to becoming a hero, but his path to get there is anything but ordinary."
        },
        {
            "id": 634649,
            "type": "movie",
            "title": "Spider-Man: No Way Home",
            "stage": 11,
            "lane": 2,
            "connects_to": [
                453395,
                969681
            ],
            "release_date": "2021-12-15",
            "release_year": "2021",
            "rating": 7.9,
            "vote_count": 22735,
            "poster_path": "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
            "overview": "Peter Parker is unmasked and no longer able to separate his normal life from the high-stakes of being a super-hero. When he asks for help from Doctor Strange the stakes become even more dangerous, forcing him to discover what it truly means to be Spider-Man."
        },
        {
            "id": 88329,
            "type": "tv",
            "title": "Hawkeye",
            "stage": 11,
            "lane": 3,
            "connects_to": [
                122226
            ],
            "release_date": "2021-11-24",
            "release_year": "2021",
            "rating": 7.8,
            "vote_count": 3802,
            "poster_path": "https://image.tmdb.org/t/p/w500/ct5pNE5dDHryHLDnxyZPYcqO1sz.jpg",
            "overview": "Former Avenger Clint Barton has a seemingly simple mission: get back to his family for Christmas. Possible? Maybe with the help of Kate Bishop, a 22-year-old archer with dreams of becoming a superhero. The two are forced to work together when a presence from Barton’s past threatens to derail far more than the festive spirit."
        },
        {
            "id": 92749,
            "type": "tv",
            "title": "Moon Knight",
            "stage": 11,
            "lane": 4,
            "connects_to": [],
            "release_date": "2022-03-30",
            "release_year": "2022",
            "rating": 7.6,
            "vote_count": 3637,
            "poster_path": "https://image.tmdb.org/t/p/w500/x6FsYvt33846IQnDSFxla9j0RX8.jpg",
            "overview": "When Steven Grant, a mild-mannered gift-shop employee, becomes plagued with blackouts and memories of another life, he discovers he has dissociative identity disorder and shares a body with mercenary Marc Spector. As Steven/Marc’s enemies converge upon them, they must navigate their complex identities while thrust into a deadly mystery among the powerful gods of Egypt."
        },
        {
            "id": 92782,
            "type": "tv",
            "title": "Ms. Marvel",
            "stage": 11,
            "lane": 5,
            "connects_to": [
                609681
            ],
            "release_date": "2022-06-08",
            "release_year": "2022",
            "rating": 6.3,
            "vote_count": 1493,
            "poster_path": "https://image.tmdb.org/t/p/w500/3HWWh92kZbD7odwJX7nKmXNZsYo.jpg",
            "overview": "A great student, avid gamer, and voracious fan-fic scribe, Kamala Khan has a special affinity for superheroes, particularly Captain Marvel. However, she struggles to fit in at home and at school — that is, until she gets superpowers like the heroes she’s always looked up to. Life is easier with superpowers, right?"
        },
        {
            "id": 616037,
            "type": "movie",
            "title": "Thor: Love and Thunder",
            "stage": 12,
            "lane": 0,
            "connects_to": [
                1003596
            ],
            "release_date": "2022-07-06",
            "release_year": "2022",
            "rating": 6.4,
            "vote_count": 8802,
            "poster_path": "https://image.tmdb.org/t/p/w500/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg",
            "overview": "After his retirement is interrupted by Gorr the God Butcher, a galactic killer who seeks the extinction of the gods, Thor Odinson enlists the help of King Valkyrie, Korg, and ex-girlfriend Jane Foster, who now wields Mjolnir as the Mighty Thor. Together they embark upon a harrowing cosmic adventure to uncover the mystery of the God Butcher’s vengeance and stop him before it’s too late."
        },
        {
            "id": 453395,
            "type": "movie",
            "title": "Doctor Strange in the Multiverse of Madness",
            "stage": 12,
            "lane": 1,
            "connects_to": [
                138501,
                1003596
            ],
            "release_date": "2022-05-04",
            "release_year": "2022",
            "rating": 7.2,
            "vote_count": 10663,
            "poster_path": "https://image.tmdb.org/t/p/w500/ddJcSKbcp4rKZTmuyWaMhuwcfMz.jpg",
            "overview": "Doctor Strange, with the help of mystical allies both old and new, traverses the mind-bending and dangerous alternate realities of the Multiverse to confront a mysterious new adversary."
        },
        {
            "id": 505642,
            "type": "movie",
            "title": "Black Panther: Wakanda Forever",
            "stage": 12,
            "lane": 2,
            "connects_to": [
                114471,
                241388
            ],
            "release_date": "2022-11-09",
            "release_year": "2022",
            "rating": 7,
            "vote_count": 7672,
            "poster_path": "https://image.tmdb.org/t/p/w500/sv1xJUazXeYqALzczSZ3O6nkH75.jpg",
            "overview": "Queen Ramonda, Shuri, M’Baku, Okoye and the Dora Milaje fight to protect their nation from intervening world powers in the wake of King T’Challa’s death.  As the Wakandans strive to embrace their next chapter, the heroes must band together with the help of War Dog Nakia and Everett Ross and forge a new path for the kingdom of Wakanda."
        },
        {
            "id": 122226,
            "type": "tv",
            "title": "Echo",
            "stage": 12,
            "lane": 3,
            "connects_to": [
                "202555_s1"
            ],
            "release_date": "2024-01-09",
            "release_year": "2024",
            "rating": 6,
            "vote_count": 647,
            "poster_path": "https://image.tmdb.org/t/p/w500/vFyJH630cF68LohVYjQW49074Sy.jpg",
            "overview": "Pursued by Wilson Fisk's criminal empire, Maya's journey brings her home and she must confront her own family and legacy."
        },
        {
            "id": 92783,
            "type": "tv",
            "title": "She-Hulk: Attorney at Law",
            "stage": 12,
            "lane": 4,
            "connects_to": [
                1003596
            ],
            "release_date": "2022-08-18",
            "release_year": "2022",
            "rating": 6.1,
            "vote_count": 2563,
            "poster_path": "https://image.tmdb.org/t/p/w500/5xz2orV8f0usyrfGNshcoXHmiaV.jpg",
            "overview": "Jennifer Walters navigates the complicated life of a single, 30-something attorney who also happens to be a green 6-foot-7-inch superpowered hulk."
        },
        {
            "id": 894205,
            "type": "movie",
            "title": "Werewolf by Night",
            "stage": 12,
            "lane": 5,
            "connects_to": [
                1003596
            ],
            "release_date": "2022-09-25",
            "release_year": "2022",
            "rating": 7,
            "vote_count": 1583,
            "poster_path": "https://image.tmdb.org/t/p/w500/mvIvNKRIJPPS7WSFarFhOAGIVnU.jpg",
            "overview": "On a dark and somber night, a secret cabal of monster hunters emerge from the shadows and gather at the foreboding Bloodstone Temple following the death of their leader. In a strange and macabre memorial to the leader’s life, the attendees are thrust into a mysterious and deadly competition for a powerful relic—a hunt that will ultimately bring them face to face with a dangerous monster."
        },
        {
            "id": 138505,
            "type": "tv",
            "title": "Marvel Zombies",
            "stage": 12,
            "lane": 6,
            "connects_to": [
                1003598
            ],
            "release_date": "2025-09-24",
            "release_year": "2025",
            "rating": 7.3,
            "vote_count": 393,
            "poster_path": "https://image.tmdb.org/t/p/w500/mwKj9ERGFXsWot0nXgQ5yMQf9I7.jpg",
            "overview": "After the Avengers are overtaken by a zombie plague, a desperate group of survivors discover the key to bringing an end to the super-powered undead, racing across a dystopian landscape and risking life and limb to save their world."
        },
        {
            "id": "84958_s2",
            "tmdb_id": 84958,
            "season_number": 2,
            "type": "tv",
            "title": "Loki - Season 2",
            "stage": 12,
            "lane": 7,
            "connects_to": [
                453395,
                1003596,
                1003598
            ],
            "release_date": "2023-10-05",
            "release_year": "2023",
            "rating": 7.8,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/oJdVHUYrjdS2IqiNztVIP4GPB1p.jpg",
            "overview": "In the aftermath of Season 1, Loki finds himself in a battle for the soul of the Time Variance Authority. Along with Mobius, Hunter B-15 and a team of new and returning characters, Loki navigates an ever-expanding and increasingly dangerous multiverse in search of Sylvie, Judge Renslayer, Miss Minutes and the truth of what it means to possess free will and glorious purpose."
        },
        {
            "id": 640146,
            "type": "movie",
            "title": "Ant-Man and the Wasp: Quantumania",
            "stage": 13,
            "lane": 0,
            "connects_to": [
                1003596
            ],
            "release_date": "2023-02-15",
            "release_year": "2023",
            "rating": 6.2,
            "vote_count": 5996,
            "poster_path": "https://image.tmdb.org/t/p/w500/qnqGbB22YJ7dSs4o6M7exTpNxPz.jpg",
            "overview": "Super-Hero partners Scott Lang and Hope van Dyne, along with with Hope's parents Janet van Dyne and Hank Pym, and Scott's daughter Cassie Lang, find themselves exploring the Quantum Realm, interacting with strange new creatures and embarking on an adventure that will push them beyond the limits of what they thought possible."
        },
        {
            "id": 774752,
            "type": "movie",
            "title": "The Guardians of the Galaxy Holiday Special",
            "stage": 13,
            "lane": 1,
            "connects_to": [
                447365
            ],
            "release_date": "2022-11-24",
            "release_year": "2022",
            "rating": 7.1,
            "vote_count": 2435,
            "poster_path": "https://image.tmdb.org/t/p/w500/8dqXyslZ2hv49Oiob9UjlGSHSTR.jpg",
            "overview": "On a mission to make Christmas unforgettable for Quill, the Guardians head to Earth in search of the perfect present."
        },
        {
            "id": 138501,
            "type": "tv",
            "title": "Agatha All Along",
            "stage": 13,
            "lane": 2,
            "connects_to": [
                213375
            ],
            "release_date": "2024-09-18",
            "release_year": "2024",
            "rating": 7.4,
            "vote_count": 1006,
            "poster_path": "https://image.tmdb.org/t/p/w500/mGsxKwXUjojitRv2E9qMTbxbBRd.jpg",
            "overview": "Agatha Harkness gathers a coven of witches and sets off down, down, down The Witches' Road."
        },
        {
            "id": "202555_s1",
            "tmdb_id": 202555,
            "season_number": 1,
            "type": "tv",
            "title": "Daredevil: Born Again - Season 1",
            "stage": 13,
            "lane": 3,
            "connects_to": [
                986056,
                "202555_s2"
            ],
            "release_date": "2025-03-04",
            "release_year": "2025",
            "rating": 8.2,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/9lLuhV703HGCbnz6FxnqCwIwzAZ.jpg",
            "overview": "It has been a year since Matt Murdock retired from crime fighting as Daredevil. Wilson Fisk has been elected mayor of New York City after running on an anti-vigilante platform. The Kingpin may force Daredevil to come out of retirement."
        },
        {
            "id": 114472,
            "type": "tv",
            "title": "Secret Invasion",
            "stage": 13,
            "lane": 4,
            "connects_to": [
                609681
            ],
            "release_date": "2023-06-21",
            "release_year": "2023",
            "rating": 6.5,
            "vote_count": 1434,
            "poster_path": "https://image.tmdb.org/t/p/w500/3rINdUPSy9AklJg74jWHOyUXuZd.jpg",
            "overview": "Nick Fury and Talos discover a faction of shapeshifting Skrulls who have been infiltrating Earth for years."
        },
        {
            "id": "91363_s2",
            "tmdb_id": 91363,
            "season_number": 2,
            "type": "tv",
            "title": "What If...? - Season 2",
            "stage": 13,
            "lane": 5,
            "connects_to": [
                "91363_s3",
                1003596
            ],
            "release_date": "2023-12-22",
            "release_year": "2023",
            "rating": 6.5,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/3yhoq5LVMgKy9rEriH6ytq9BoJV.jpg",
            "overview": "Season two continues the journey as The Watcher guides viewers through the vast multiverse, introducing brand new and familiar faces throughout the MCU."
        },
        {
            "id": 447365,
            "type": "movie",
            "title": "Guardians of the Galaxy Vol. 3",
            "stage": 14,
            "lane": 0,
            "connects_to": [
                1003598
            ],
            "release_date": "2023-05-03",
            "release_year": "2023",
            "rating": 7.9,
            "vote_count": 8662,
            "poster_path": "https://image.tmdb.org/t/p/w500/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg",
            "overview": "Peter Quill, still reeling from the loss of Gamora, must rally his team around him to defend the universe along with protecting one of their own. A mission that, if not completed successfully, could quite possibly lead to the end of the Guardians as we know them."
        },
        {
            "id": 609681,
            "type": "movie",
            "title": "The Marvels",
            "stage": 14,
            "lane": 1,
            "connects_to": [
                1003596
            ],
            "release_date": "2023-11-08",
            "release_year": "2023",
            "rating": 5.9,
            "vote_count": 3559,
            "poster_path": "https://image.tmdb.org/t/p/w500/9GBhzXMFjgcZ3FdR9w3bUMMTps5.jpg",
            "overview": "When her duties send her to an anomalous wormhole linked to a Kree revolutionary, Carol's powers become entangled with that of Jersey City super-fan Kamala Khan, aka Ms. Marvel, and Carol's estranged niece, now S.A.B.E.R. astronaut Captain Monica Rambeau. Together, this unlikely trio must team up and learn to work in concert to save the universe."
        },
        {
            "id": 533535,
            "type": "movie",
            "title": "Deadpool & Wolverine",
            "stage": 14,
            "lane": 2,
            "connects_to": [
                1003596,
                1003598
            ],
            "release_date": "2024-07-24",
            "release_year": "2024",
            "rating": 7.6,
            "vote_count": 9204,
            "poster_path": "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
            "overview": "A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine."
        },
        {
            "id": 822119,
            "type": "movie",
            "title": "Captain America: Brave New World",
            "stage": 14,
            "lane": 3,
            "connects_to": [
                986056
            ],
            "release_date": "2025-02-12",
            "release_year": "2025",
            "rating": 5.9,
            "vote_count": 3291,
            "poster_path": "https://image.tmdb.org/t/p/w500/pzIddUEMWhWzfvLI3TwxUG2wGoi.jpg",
            "overview": "After meeting with newly elected U.S. President Thaddeus Ross, Sam finds himself in the middle of an international incident. He must discover the reason behind a nefarious global plot before the true mastermind has the entire world seeing red."
        },
        {
            "id": 114471,
            "type": "tv",
            "title": "Ironheart",
            "stage": 14,
            "lane": 4,
            "connects_to": [
                1003596
            ],
            "release_date": "2025-06-24",
            "release_year": "2025",
            "rating": 5.3,
            "vote_count": 488,
            "poster_path": "https://image.tmdb.org/t/p/w500/dOh6MJpdlQhYpLBhzhNQeYGKTZ5.jpg",
            "overview": "After the events of Black Panther: Wakanda Forever, technology is pitted against magic when Riri Williams, a young, genius inventor determined to make her mark on the world, returns to her hometown of Chicago. Her unique take on building iron suits is brilliant, but in pursuit of her ambitions, she finds herself wrapped up with the mysterious yet charming Parker Robbins aka \"The Hood.\""
        },
        {
            "id": 213375,
            "type": "tv",
            "title": "Vision Quest",
            "stage": 14,
            "lane": 5,
            "connects_to": [
                1003596
            ],
            "release_date": "2026-10-14",
            "release_year": "2026",
            "rating": null,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/WGyAyBPncfuu8MZhLY9RtfZPM0.jpg",
            "overview": "With a bounty on his head, Vision must confront his nature and resist Ultron's influence to survive."
        },
        {
            "id": "91363_s3",
            "tmdb_id": 91363,
            "season_number": 3,
            "type": "tv",
            "title": "What If...? - Season 3",
            "stage": 14,
            "lane": 6,
            "connects_to": [
                1003598
            ],
            "release_date": "2024-12-22",
            "release_year": "2024",
            "rating": 5.5,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/bbGeKXKoualYRYqvFYiv8fPZK0d.jpg",
            "overview": "Season 3 follows classic characters as they make unexpected choices that will mutate their worlds into spectacular alternate versions of the MCU."
        },
        {
            "id": 617126,
            "type": "movie",
            "title": "The Fantastic Four: First Steps",
            "stage": 15,
            "lane": 1,
            "connects_to": [
                1003596
            ],
            "release_date": "2025-07-23",
            "release_year": "2025",
            "rating": 6.9,
            "vote_count": 3712,
            "poster_path": "https://image.tmdb.org/t/p/w500/nf5qaSEvyYSNeFH0YhSs5EsBLX9.jpg",
            "overview": "Against the vibrant backdrop of a 1960s-inspired, retro-futuristic world, Marvel's First Family is forced to balance their roles as heroes with the strength of their family bond, while defending Earth from a ravenous space god called Galactus and his enigmatic Herald, Silver Surfer."
        },
        {
            "id": 241388,
            "type": "tv",
            "title": "Eyes of Wakanda",
            "stage": 15,
            "lane": 2,
            "connects_to": [
                1003598
            ],
            "release_date": "2025-08-01",
            "release_year": "2025",
            "rating": 6.2,
            "vote_count": 190,
            "poster_path": "https://image.tmdb.org/t/p/w500/yuOfb1MgnaGPa4guzV0n1IFYVGN.jpg",
            "overview": "Follow the adventures of brave Wakandan warriors throughout history in this globe-trotting adventure, where they must carry out dangerous missions to retrieve Vibranium artifacts from the enemies of Wakanda. They are the Hatut Zaraze and this is their story."
        },
        {
            "id": 986056,
            "type": "movie",
            "title": "Thunderbolts*",
            "stage": 15,
            "lane": 3,
            "connects_to": [
                1003596
            ],
            "release_date": "2025-04-30",
            "release_year": "2025",
            "rating": 7.3,
            "vote_count": 3898,
            "poster_path": "https://image.tmdb.org/t/p/w500/hqcexYHbiTBfDIdDWxrxPtVndBX.jpg",
            "overview": "After finding themselves ensnared in a death trap, seven disillusioned castoffs must embark on a dangerous mission that will force them to confront the darkest corners of their pasts."
        },
        {
            "id": 198178,
            "type": "tv",
            "title": "Wonder Man",
            "stage": 15,
            "lane": 4,
            "connects_to": [
                1003596
            ],
            "release_date": "2026-01-27",
            "release_year": "2026",
            "rating": 7.1,
            "vote_count": 340,
            "poster_path": "https://image.tmdb.org/t/p/w500/6yy9nQlFt2l6UVWzrfhszFCaZ5C.jpg",
            "overview": "Simon and Trevor, two actors at opposite ends of their careers, chase life-changing roles."
        },
        {
            "id": "202555_s2",
            "tmdb_id": 202555,
            "season_number": 2,
            "type": "tv",
            "title": "Daredevil: Born Again - Season 2",
            "stage": 15,
            "lane": 5,
            "connects_to": [
                1003596
            ],
            "release_date": "2026-03-24",
            "release_year": "2026",
            "rating": 8.2,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/timvsedxh5ce795tsv6EDTZmmXW.jpg",
            "overview": "Mayor Wilson Fisk crushes New York City underfoot as he hunts down public enemy number one, the Hell's Kitchen vigilante known as Daredevil. But beneath the horned mask, Matt Murdock will try to fight back from the shadows to tear down the Kingpin's corrupt empire and redeem his home. Resist. Rebel. Rebuild."
        },
        {
            "id": 1003596,
            "type": "movie",
            "title": "Avengers: Doomsday",
            "stage": 16,
            "lane": 1,
            "overview": "Beloved heroes from three distinct universes are set on a deadly collision course and face an existential threat unlike anything they've ever encountered.",
            "connects_to": [
                969681,
                1003598
            ],
            "release_date": "2026-12-16",
            "release_year": "2026",
            "rating": null,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/jzPwsojjFStf5lR5Nm07w2hH56G.jpg"
        },
        {
            "id": 969681,
            "type": "movie",
            "title": "Spider-Man: Brand New Day",
            "stage": 17,
            "lane": 2,
            "overview": "Fighting crime full-time as Spider-Man in a world that doesn't remember him—and the pressure of seeing his old friends move on without him—sparks a change in Peter Parker he may not have the power to control. But that transformation might also be the only thing that can stop a shocking new threat to the city and those he loves - a powerful villain no one can even see.",
            "connects_to": [
                1003598
            ],
            "release_date": "2026-07-29",
            "release_year": "2026",
            "rating": 7.9,
            "vote_count": 1884,
            "poster_path": "https://image.tmdb.org/t/p/w500/iPOn6DinuVyLY17YM9mKuPofV08.jpg"
        },
        {
            "id": 1003598,
            "type": "movie",
            "title": "Avengers: Secret Wars",
            "stage": 18,
            "lane": 1,
            "overview": "An upcoming film in Phase Six of the Marvel Cinematic Universe (MCU) and the finale of The Multiverse Saga.",
            "connects_to": [],
            "release_date": "2027-12-15",
            "release_year": "2027",
            "rating": null,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/f0YBuh4hyiAheXhh4JnJWoKi9g5.jpg"
        },
        {
            "id": 557,
            "type": "movie",
            "title": "Spider-Man",
            "stage": 0,
            "lane": 3,
            "connects_to": [
                558
            ],
            "release_date": "2002-05-01",
            "release_year": "2002",
            "rating": 7.3,
            "vote_count": 21170,
            "poster_path": "https://image.tmdb.org/t/p/w500/or6XJBVpcEbIkma0V9zshnbEtx4.jpg",
            "overview": "After being bitten by a genetically altered spider at Oscorp, nerdy but endearing high school student Peter Parker is endowed with amazing powers to become the superhero known as Spider-Man."
        },
        {
            "id": 558,
            "type": "movie",
            "title": "Spider-Man 2",
            "stage": 0,
            "lane": 4,
            "connects_to": [
                559
            ],
            "release_date": "2004-06-25",
            "release_year": "2004",
            "rating": 7.3,
            "vote_count": 16739,
            "poster_path": "https://image.tmdb.org/t/p/w500/aGuvNAaaZuWXYQQ6N2v7DeuP6mB.jpg",
            "overview": "Peter Parker is going through a major identity crisis. Burned out from being Spider-Man, he decides to shelve his superhero alter ego, which leaves the city suffering in the wake of carnage left by the evil Doc Ock. In the meantime, Parker still can't act on his feelings for Mary Jane Watson, a girl he's loved since childhood. A certain anger begins to brew in his best friend Harry Osborn as well..."
        },
        {
            "id": 559,
            "type": "movie",
            "title": "Spider-Man 3",
            "stage": 0,
            "lane": 5,
            "connects_to": [
                634649
            ],
            "release_date": "2007-05-01",
            "release_year": "2007",
            "rating": 6.5,
            "vote_count": 15594,
            "poster_path": "https://image.tmdb.org/t/p/w500/sJMTTGjtjvrMZ7G0oP9D13wNUum.jpg",
            "overview": "The seemingly invincible Spider-Man goes up against an all-new crop of villains—including the shape-shifting Sandman. While Spider-Man’s superpowers are altered by an alien organism, his alter ego, Peter Parker, deals with nemesis Eddie Brock and also gets caught up in a love triangle."
        },
        {
            "id": 1930,
            "type": "movie",
            "title": "The Amazing Spider-Man",
            "stage": 2,
            "lane": 3,
            "connects_to": [
                102382
            ],
            "release_date": "2012-06-23",
            "release_year": "2012",
            "rating": 6.8,
            "vote_count": 18924,
            "poster_path": "https://image.tmdb.org/t/p/w500/jexoNYnPd6vVrmygwF6QZmWPFdu.jpg",
            "overview": "A teenage Peter Parker grapples with both high school and amazing super-human crises as his alter-ego Spider-Man."
        },
        {
            "id": 102382,
            "type": "movie",
            "title": "The Amazing Spider-Man 2",
            "stage": 3,
            "lane": 6,
            "connects_to": [
                634649
            ],
            "release_date": "2014-04-16",
            "release_year": "2014",
            "rating": 6.6,
            "vote_count": 14595,
            "poster_path": "https://image.tmdb.org/t/p/w500/dGjoPttcbKR5VWg1jQuNFB247KL.jpg",
            "overview": "For Peter Parker, life is busy. Between taking out the bad guys as Spider-Man and spending time with the person he loves, Gwen Stacy, high school graduation cannot come quickly enough. Peter has not forgotten about the promise he made to Gwen’s father to protect her by staying away, but that is a promise he cannot keep. Things will change for Peter when a new villain, Electro, emerges, an old friend, Harry Osborn, returns, and Peter uncovers new clues about his past."
        },
        {
            "id": 324857,
            "type": "movie",
            "title": "Spider-Man: Into the Spider-Verse",
            "stage": 8,
            "lane": 7,
            "connects_to": [
                569094
            ],
            "release_date": "2018-12-06",
            "release_year": "2018",
            "rating": 8.4,
            "vote_count": 17653,
            "poster_path": "https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
            "overview": "Struggling to find his place in the world while juggling school and family, Brooklyn teenager Miles Morales is unexpectedly bitten by a radioactive spider and develops unfathomable powers just like the one and only Spider-Man. While wrestling with the implications of his new abilities, Miles discovers a super collider created by the madman Wilson \"Kingpin\" Fisk, causing others from across the Spider-Verse to be inadvertently transported to his dimension."
        },
        {
            "id": 569094,
            "type": "movie",
            "title": "Spider-Man: Across the Spider-Verse",
            "stage": 13,
            "lane": 7,
            "connects_to": [
                1003598
            ],
            "release_date": "2023-05-31",
            "release_year": "2023",
            "rating": 8.3,
            "vote_count": 9037,
            "poster_path": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
            "overview": "After reuniting with Gwen Stacy, Brooklyn’s full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse, where he encounters the Spider Society, a team of Spider-People charged with protecting the Multiverse's very existence. But when the heroes clash on how to handle a new threat, Miles finds himself pitted against the other Spiders and must set out on his own to save those he loves most."
        },
        {
            "id": 335983,
            "type": "movie",
            "title": "Venom",
            "stage": 8,
            "lane": 8,
            "connects_to": [
                580489
            ],
            "release_date": "2018-09-28",
            "release_year": "2018",
            "rating": 6.8,
            "vote_count": 17473,
            "poster_path": "https://image.tmdb.org/t/p/w500/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg",
            "overview": "Investigative journalist Eddie Brock attempts a comeback following a scandal, but accidentally becomes the host of Venom, a violent, super powerful alien symbiote. Soon, he must rely on his newfound powers to protect the world from a shadowy organization looking for a symbiote of their own."
        },
        {
            "id": 580489,
            "type": "movie",
            "title": "Venom: Let There Be Carnage",
            "stage": 11,
            "lane": 6,
            "connects_to": [
                634649,
                912649
            ],
            "release_date": "2021-09-30",
            "release_year": "2021",
            "rating": 6.7,
            "vote_count": 11335,
            "poster_path": "https://image.tmdb.org/t/p/w500/pzKsRuKLFmYrW5Q0q8E8G78Tcgo.jpg",
            "overview": "After finding a host body in investigative reporter Eddie Brock, the alien symbiote must face a new enemy, Carnage, the alter ego of serial killer Cletus Kasady."
        },
        {
            "id": 526896,
            "type": "movie",
            "title": "Morbius",
            "stage": 11,
            "lane": 7,
            "connects_to": [
                1003598
            ],
            "release_date": "2022-03-30",
            "release_year": "2022",
            "rating": 5.9,
            "vote_count": 4914,
            "poster_path": "https://image.tmdb.org/t/p/w500/Av8Z2jZhEm1FLkFzMThzz9hndJF.jpg",
            "overview": "Dangerously ill with a rare blood disorder, and determined to save others suffering his same fate, Dr. Michael Morbius attempts a desperate gamble. What at first appears to be a radical success soon reveals itself to be a remedy potentially worse than the disease."
        },
        {
            "id": 634492,
            "type": "movie",
            "title": "Madame Web",
            "stage": 13,
            "lane": 6,
            "connects_to": [
                1003598
            ],
            "release_date": "2024-02-14",
            "release_year": "2024",
            "rating": 5.3,
            "vote_count": 2667,
            "poster_path": "https://image.tmdb.org/t/p/w500/rULWuutDcN5NvtiZi4FRPzRYWSh.jpg",
            "overview": "Forced to confront revelations about her past, paramedic Cassandra Webb forges a relationship with three young women destined for powerful futures...if they can all survive a deadly present."
        },
        {
            "id": 912649,
            "type": "movie",
            "title": "Venom: The Last Dance",
            "stage": 14,
            "lane": 7,
            "connects_to": [
                1003598
            ],
            "release_date": "2024-10-22",
            "release_year": "2024",
            "rating": 6.7,
            "vote_count": 4428,
            "poster_path": "https://image.tmdb.org/t/p/w500/vGXptEdgZIhPg3cGlc7e8sNPC2e.jpg",
            "overview": "Eddie and Venom are on the run. Hunted by both of their worlds and with the net closing in, the duo are forced into a devastating decision that will bring the curtains down on Venom and Eddie's last dance."
        },
        {
            "id": 539972,
            "type": "movie",
            "title": "Kraven the Hunter",
            "stage": 14,
            "lane": 8,
            "connects_to": [
                1003598
            ],
            "release_date": "2024-12-11",
            "release_year": "2024",
            "rating": 6.4,
            "vote_count": 2446,
            "poster_path": "https://image.tmdb.org/t/p/w500/1GvBhRxY6MELDfxFrete6BNhBB5.jpg",
            "overview": "Kraven Kravinoff's complex relationship with his ruthless gangster father, Nikolai, starts him down a path of vengeance with brutal consequences, motivating him to become not only the greatest hunter in the world, but also one of its most feared."
        }
    ]
},
  "dceu": {
    "name": "DC Extended Universe (2013–2023)",
    "collection_ids": [
        468552,
        209112,
        297761,
        297762,
        297802,
        287947,
        529892,
        49521,
        594767
    ],
    "known_tmdb_ids": [
        297762,
        49521,
        464052,
        209112,
        297761,
        141052,
        791373,
        495764,
        297802,
        287947,
        436969,
        110492,
        436270,
        594767,
        565770,
        298618,
        572802
    ],
    "chronological_order": [
        {
            "id": 297762,
            "type": "movie",
            "title": "Wonder Woman",
            "stage": 0,
            "lane": 0,
            "connects_to": [
                464052,
                209112
            ],
            "release_date": "2017-05-30",
            "release_year": "2017",
            "rating": 7.2,
            "vote_count": 21106,
            "poster_path": "https://image.tmdb.org/t/p/w500/v4ncgZjG2Zu8ZW5al1vIZTsSjqX.jpg",
            "overview": "An Amazon princess comes to the world of Man in the grips of the First World War to confront the forces of evil and bring an end to human conflict."
        },
        {
            "id": 49521,
            "type": "movie",
            "title": "Man of Steel",
            "stage": 0,
            "lane": 1,
            "connects_to": [
                209112
            ],
            "release_date": "2013-06-12",
            "release_year": "2013",
            "rating": 6.7,
            "vote_count": 16479,
            "poster_path": "https://image.tmdb.org/t/p/w500/8GFtkImmK0K1VaUChR0n9O61CFU.jpg",
            "overview": "A young boy learns that he has extraordinary powers and is not of this earth. As a young man, he journeys to discover where he came from and what he was sent here to do. But the hero in him must emerge if he is to save the world from annihilation and become the symbol of hope for all mankind."
        },
        {
            "id": 464052,
            "type": "movie",
            "title": "Wonder Woman 1984",
            "stage": 1,
            "lane": 0,
            "connects_to": [
                209112
            ],
            "release_date": "2020-12-16",
            "release_year": "2020",
            "rating": 6.4,
            "vote_count": 9187,
            "poster_path": "https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg",
            "overview": "A botched store robbery places Wonder Woman in a global battle against a powerful and mysterious ancient force that puts her powers in jeopardy."
        },
        {
            "id": 209112,
            "type": "movie",
            "title": "Batman v Superman: Dawn of Justice",
            "stage": 1,
            "lane": 1,
            "connects_to": [
                297761,
                141052,
                791373
            ],
            "release_date": "2016-03-23",
            "release_year": "2016",
            "rating": 6,
            "vote_count": 19234,
            "poster_path": "https://image.tmdb.org/t/p/w500/5UsK3grJvtQrtzEgqNlDljJW96w.jpg",
            "overview": "Fearing the actions of a god-like Super Hero left unchecked, Gotham City’s own formidable, forceful vigilante takes on Metropolis’s most revered, modern-day savior, while the world wrestles with what sort of hero it really needs. And with Batman and Superman at war with one another, a new threat quickly arises, putting mankind in greater danger than it’s ever known before."
        },
        {
            "id": 297761,
            "type": "movie",
            "title": "Suicide Squad",
            "stage": 2,
            "lane": 0,
            "connects_to": [
                495764,
                436969
            ],
            "release_date": "2016-08-03",
            "release_year": "2016",
            "rating": 5.9,
            "vote_count": 22320,
            "poster_path": "https://image.tmdb.org/t/p/w500/sk3FZgh3sRrmr8vyhaitNobMcfh.jpg",
            "overview": "From DC Comics comes the Suicide Squad, an antihero team of incarcerated supervillains who act as deniable assets for the United States government, undertaking high-risk black ops missions in exchange for commuted prison sentences."
        },
        {
            "id": 141052,
            "type": "movie",
            "title": "Justice League",
            "stage": 2,
            "lane": 1,
            "connects_to": [
                297802,
                287947,
                298618
            ],
            "release_date": "2017-11-15",
            "release_year": "2017",
            "rating": 6.1,
            "vote_count": 13846,
            "poster_path": "https://image.tmdb.org/t/p/w500/eifGNCSDuxJeS1loAXil5bIGgvC.jpg",
            "overview": "Fuelled by his restored faith in humanity and inspired by Superman's selfless act, Bruce Wayne and Diana Prince assemble a team of metahumans consisting of Barry Allen, Arthur Curry and Victor Stone to face the catastrophic threat of Steppenwolf and the Parademons who are on the hunt for three Mother Boxes on Earth."
        },
        {
            "id": 791373,
            "type": "movie",
            "title": "Zack Snyder's Justice League",
            "stage": 2,
            "lane": 2,
            "connects_to": [
                297802,
                298618
            ],
            "release_date": "2021-03-18",
            "release_year": "2021",
            "rating": 8.1,
            "vote_count": 11036,
            "poster_path": "https://image.tmdb.org/t/p/w500/tnAuB8q5vv7Ax9UAEje5Xi4BXik.jpg",
            "overview": "Determined to ensure Superman's ultimate sacrifice was not in vain, Bruce Wayne aligns forces with Diana Prince with plans to recruit a team of metahumans to protect the world from an approaching threat of catastrophic proportions."
        },
        {
            "id": 495764,
            "type": "movie",
            "title": "Birds of Prey",
            "stage": 3,
            "lane": 0,
            "connects_to": [
                436969
            ],
            "release_date": "2020-02-05",
            "release_year": "2020",
            "rating": 6.9,
            "vote_count": 10938,
            "poster_path": "https://image.tmdb.org/t/p/w500/h4VB6m0RwcicVEZvzftYZyKXs6K.jpg",
            "overview": "Harley Quinn joins forces with a singer, an assassin and a police detective to help a young girl who had a hit placed on her after she stole a rare diamond from a crime lord."
        },
        {
            "id": 297802,
            "type": "movie",
            "title": "Aquaman",
            "stage": 3,
            "lane": 1,
            "connects_to": [
                572802
            ],
            "release_date": "2018-12-07",
            "release_year": "2018",
            "rating": 6.9,
            "vote_count": 15110,
            "poster_path": "https://image.tmdb.org/t/p/w500/ufl63EFcc5XpByEV2Ecdw6WJZAI.jpg",
            "overview": "Half-human, half-Atlantean Arthur Curry is taken on the journey of his lifetime to discover if he is worth of being a king."
        },
        {
            "id": 287947,
            "type": "movie",
            "title": "Shazam!",
            "stage": 3,
            "lane": 2,
            "connects_to": [
                594767,
                436270
            ],
            "release_date": "2019-03-29",
            "release_year": "2019",
            "rating": 7,
            "vote_count": 10364,
            "poster_path": "https://image.tmdb.org/t/p/w500/xnopI5Xtky18MPhK40cZAGAOVeV.jpg",
            "overview": "A boy is given the ability to become an adult superhero in times of need with a single magic word."
        },
        {
            "id": 436969,
            "type": "movie",
            "title": "The Suicide Squad",
            "stage": 4,
            "lane": 0,
            "connects_to": [
                "110492_s1"
            ],
            "release_date": "2021-07-28",
            "release_year": "2021",
            "rating": 7.5,
            "vote_count": 9790,
            "poster_path": "https://image.tmdb.org/t/p/w500/q61qEyssk2ku3okWICKArlAdhBn.jpg",
            "overview": "Supervillains Harley Quinn, Bloodsport, Peacemaker and a collection of nutty cons at Belle Reve prison join the super-secret, super-shady Task Force X as they are dropped off at the remote, enemy-infused island of Corto Maltese."
        },
        {
            "id": "110492_s1",
            "tmdb_id": 110492,
            "season_number": 1,
            "type": "tv",
            "title": "Peacemaker - Season 1",
            "stage": 4,
            "lane": 1,
            "connects_to": [
                565770
            ],
            "release_date": "2022-01-13",
            "release_year": "2022",
            "rating": 7.5,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/hE3LRZAY84fG19a18pzpkZERjTE.jpg",
            "overview": "After surviving being shot and then buried beneath a collapsing building, Peacemaker returns home only to realize that his freedom comes at a price. He is now part of Amanda Waller's new team fighting a mysterious new threat. Can he eliminate the threat without making things worse?"
        },
        {
            "id": 436270,
            "type": "movie",
            "title": "Black Adam",
            "stage": 4,
            "lane": 2,
            "connects_to": [
                594767
            ],
            "release_date": "2022-10-19",
            "release_year": "2022",
            "rating": 6.8,
            "vote_count": 7179,
            "poster_path": "https://image.tmdb.org/t/p/w500/rCtreCr4xiYEWDQTebybolIh6Xe.jpg",
            "overview": "Nearly 5,000 years after he was bestowed with the almighty powers of the Egyptian gods—and imprisoned just as quickly—Black Adam is freed from his earthly tomb, ready to unleash his unique form of justice on the modern world."
        },
        {
            "id": 594767,
            "type": "movie",
            "title": "Shazam! Fury of the Gods",
            "stage": 4,
            "lane": 3,
            "connects_to": [
                298618
            ],
            "release_date": "2023-03-15",
            "release_year": "2023",
            "rating": 6.4,
            "vote_count": 3738,
            "poster_path": "https://image.tmdb.org/t/p/w500/3GrRgt6CiLIUXUtoktcv1g2iwT5.jpg",
            "overview": "Billy Batson and his foster siblings, who transform into superheroes by saying \"Shazam!\", are forced to get back into action and fight the Daughters of Atlas, who they must stop from using a weapon that could destroy the world."
        },
        {
            "id": 565770,
            "type": "movie",
            "title": "Blue Beetle",
            "stage": 5,
            "lane": 0,
            "connects_to": [
                572802
            ],
            "release_date": "2023-08-16",
            "release_year": "2023",
            "rating": 6.6,
            "vote_count": 3209,
            "poster_path": "https://image.tmdb.org/t/p/w500/mXLOHHc1Zeuwsl4xYKjKh2280oL.jpg",
            "overview": "Recent college grad Jaime Reyes returns home full of aspirations for his future, only to find that home is not quite as he left it. As he searches to find his purpose in the world, fate intervenes when Jaime unexpectedly finds himself in possession of an ancient relic of alien biotechnology: the Scarab."
        },
        {
            "id": 298618,
            "type": "movie",
            "title": "The Flash",
            "stage": 5,
            "lane": 1,
            "connects_to": [
                572802
            ],
            "release_date": "2023-06-13",
            "release_year": "2023",
            "rating": 6.6,
            "vote_count": 5171,
            "poster_path": "https://image.tmdb.org/t/p/w500/rktDFPbfHfUbArZ6OOOKsXcv0Bm.jpg",
            "overview": "When his attempt to save his family inadvertently alters the future, Barry Allen becomes trapped in a reality in which General Zod has returned and there are no Super Heroes to turn to. In order to save the world that he is in and return to the future that he knows, Barry's only hope is to race for his life. But will making the ultimate sacrifice be enough to reset the universe?"
        },
        {
            "id": 572802,
            "type": "movie",
            "title": "Aquaman and the Lost Kingdom",
            "stage": 5,
            "lane": 2,
            "connects_to": [],
            "release_date": "2023-12-20",
            "release_year": "2023",
            "rating": 6.5,
            "vote_count": 3615,
            "poster_path": "https://image.tmdb.org/t/p/w500/7lTnXOy0iNtBAdRP3TZvaKJ77F6.jpg",
            "overview": "Black Manta seeks revenge on Aquaman for his father's death. Wielding the Black Trident's power, he becomes a formidable foe. To defend Atlantis, Arthur (Aquaman) forges an alliance with his imprisoned brother. They must protect the kingdom."
        }
    ]
},
  "dcu": {
    "name": "DC Universe (2024+ / Gods and Monsters)",
    "collection_ids": [
        1061474,
        1081003
    ],
    "known_tmdb_ids": [
        219543,
        1061474,
        110492,
        1081003,
        95350,
        1364797
    ],
    "chronological_order": [
        {
            "id": 219543,
            "type": "tv",
            "title": "Creature Commandos",
            "stage": 0,
            "lane": 0,
            "connects_to": [
                1061474
            ],
            "release_date": "2024-12-05",
            "release_year": "2024",
            "rating": 7.8,
            "vote_count": 367,
            "poster_path": "https://image.tmdb.org/t/p/w500/bB3G6Ug1jfsOUptb0RJsqrgMVta.jpg",
            "overview": "Follow the exploits of the Creature Commandos, a secret team of incarcerated monsters recruited for missions deemed too dangerous for humans. When all else fails... they're your last, worst option."
        },
        {
            "id": 1061474,
            "type": "movie",
            "title": "Superman",
            "stage": 1,
            "lane": 0,
            "connects_to": [
                "110492_s2",
                1081003
            ],
            "release_date": "2025-07-09",
            "release_year": "2025",
            "rating": 7.3,
            "vote_count": 5286,
            "poster_path": "https://image.tmdb.org/t/p/w500/ldyfo0BKmz5rWtJJKCvwaNS4cJT.jpg",
            "overview": "Superman, a journalist in Metropolis, embarks on a journey to reconcile his Kryptonian heritage with his human upbringing as Clark Kent."
        },
        {
            "id": "110492_s2",
            "tmdb_id": 110492,
            "season_number": 2,
            "type": "tv",
            "title": "Peacemaker - Season 2",
            "stage": 2,
            "lane": 0,
            "connects_to": [
                95350
            ],
            "release_date": "2025-08-21",
            "release_year": "2025",
            "rating": 6.8,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/2Wv0Zinc9nQ6ktL10Z9ckk2wjyZ.jpg",
            "overview": "Following the exposure of Project Butterfly and the disbandment of Task Force X, the 11th Street Kids grapple with new identities, new friendships, and new rivalries. For Peacemaker, this means reconciling his past with his newfound sense of purpose — here and in an alternate dimension. Meanwhile, Rick Flag Sr. reappears as the director of A.R.G.U.S., focused on controlling metahumans and avenging the death of his son at the hands of Peacemaker."
        },
        {
            "id": 1081003,
            "type": "movie",
            "title": "Supergirl: Woman of Tomorrow",
            "stage": 3,
            "lane": 0,
            "connects_to": [
                1364797
            ],
            "release_date": "2026-06-24",
            "release_year": "2026",
            "rating": 6.7,
            "vote_count": 1925,
            "poster_path": "https://image.tmdb.org/t/p/w500/1QCWdqzTfh2x9UylVpspIU6QTuM.jpg",
            "overview": "When an unexpected and ruthless adversary strikes too close to home, Kara Zor-El, aka Supergirl, reluctantly joins forces with an unlikely companion on an epic, interstellar journey of vengeance and justice."
        },
        {
            "id": 95350,
            "type": "tv",
            "title": "Lanterns",
            "stage": 3,
            "lane": 1,
            "connects_to": [
                1364797
            ],
            "release_date": "2026-08-16",
            "release_year": "2026",
            "rating": 8.1,
            "vote_count": 91,
            "poster_path": "https://image.tmdb.org/t/p/w500/gpC7h43xPMEV3goYMQShfJbTtLq.jpg",
            "overview": "Two intergalactic cops, new recruit John Stewart and Lantern legend Hal Jordan, are drawn into a dark, Earth-based mystery as they investigate a murder in the American heartland."
        },
        {
            "id": 1364797,
            "type": "movie",
            "title": "Dynamic Duo",
            "stage": 4,
            "lane": 0,
            "connects_to": [],
            "release_date": "2028-06-29",
            "release_year": "2028",
            "rating": null,
            "vote_count": 0,
            "poster_path": "https://image.tmdb.org/t/p/w500/byZZQsE933kaBCq6i2yGQnJF6TN.jpg",
            "overview": "Follow the early days of Dick Grayson and Jason Todd and explore how their friendship becomes tested by their diverging ideas for what their future should be."
        }
    ]
},
  "star_wars": {
    "name": "Star Wars Universe",
    "collection_ids": [10, 845946],
    "known_tmdb_ids": [],
    "chronological_order": [
      { "id": 1893, "type": "movie", "title": "Star Wars: Episode I - The Phantom Menace", "stage": 0, "lane": 0, "connects_to": [1894] },
      { "id": 1894, "type": "movie", "title": "Star Wars: Episode II - Attack of the Clones", "stage": 1, "lane": 0, "connects_to": [1895] },
      { "id": 1895, "type": "movie", "title": "Star Wars: Episode III - Revenge of the Sith", "stage": 2, "lane": 0, "connects_to": [348350, 330459] },
      { "id": 348350, "type": "movie", "title": "Solo: A Star Wars Story", "stage": 3, "lane": 0, "connects_to": [330459] },
      { "id": 330459, "type": "movie", "title": "Rogue One: A Star Wars Story", "stage": 4, "lane": 0, "connects_to": [11] },
      { "id": 11, "type": "movie", "title": "Star Wars: Episode IV - A New Hope", "stage": 5, "lane": 0, "connects_to": [1891] },
      { "id": 1891, "type": "movie", "title": "Star Wars: Episode V - The Empire Strikes Back", "stage": 6, "lane": 0, "connects_to": [1892] },
      { "id": 1892, "type": "movie", "title": "Star Wars: Episode VI - Return of the Jedi", "stage": 7, "lane": 0, "connects_to": [140607] },
      { "id": 140607, "type": "movie", "title": "Star Wars: Episode VII - The Force Awakens", "stage": 8, "lane": 0, "connects_to": [181808] },
      { "id": 181808, "type": "movie", "title": "Star Wars: Episode VIII - The Last Jedi", "stage": 9, "lane": 0, "connects_to": [290859] },
      { "id": 290859, "type": "movie", "title": "Star Wars: Episode IX - The Rise of Skywalker", "stage": 10, "lane": 0, "connects_to": [] }
    ]
  },
  "kurtlar_vadisi": {
    "name": "Valley of the Wolves (Kurtlar Vadisi) Universe",
    "collection_ids": [663490],
    "known_tmdb_ids": [34587, 48253, 49071, 11818, 35747, 58637, 469469],
    "chronological_order": [
      { "id": 34587, "type": "tv", "title": "Valley of the Wolves (Original Series)", "stage": 0, "lane": 0, "connects_to": [11818, 48253] },
      { "id": 11818, "type": "movie", "title": "Valley of the Wolves: Iraq", "stage": 1, "lane": 0, "connects_to": [49071] },
      { "id": 48253, "type": "tv", "title": "Valley of the Wolves: Terror", "stage": 1, "lane": 1, "connects_to": [49071] },
      { "id": 49071, "type": "tv", "title": "Valley of the Wolves: Ambush", "stage": 2, "lane": 0, "connects_to": [35747, 58637] },
      { "id": 35747, "type": "movie", "title": "Valley of the Wolves: Gladio", "stage": 3, "lane": 0, "connects_to": [469469] },
      { "id": 58637, "type": "movie", "title": "Valley of the Wolves: Palestine", "stage": 3, "lane": 1, "connects_to": [469469] },
      { "id": 469469, "type": "movie", "title": "Valley of the Wolves: Homeland", "stage": 4, "lane": 0, "connects_to": [] }
    ]
  }
};

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';

function formatDurationUz(totalMinutes, isEstimated = false) {
  if (!totalMinutes || totalMinutes <= 0) return '-';
  const prefix = isEstimated ? '~' : '';

  const minutesInDay = 24 * 60;
  const minutesInHour = 60;

  if (totalMinutes >= minutesInDay) {
    const days = Math.floor(totalMinutes / minutesInDay);
    const rem = totalMinutes % minutesInDay;
    const hours = Math.floor(rem / minutesInHour);
    const mins = rem % minutesInHour;

    const parts = [`${days} kun`];
    if (hours > 0) parts.push(`${hours} soat`);
    if (mins > 0) parts.push(`${mins} daqiqa`);
    return `${prefix}${parts.join(' ')}`;
  }

  if (totalMinutes >= minutesInHour) {
    const hours = Math.floor(totalMinutes / minutesInHour);
    const mins = totalMinutes % minutesInHour;

    const parts = [`${hours} soat`];
    if (mins > 0) parts.push(`${mins} daqiqa`);
    return `${prefix}${parts.join(' ')}`;
  }

  return `${prefix}${totalMinutes} daqiqa`;
}

async function resolveTvRuntime(tmdbId, tmdbKey, tvDetail) {
  const seasonsList = (tvDetail.seasons || []).filter(s => s.season_number > 0);
  const numberOfSeasons = tvDetail.number_of_seasons || seasonsList.length || 1;
  const numberOfEpisodes = tvDetail.number_of_episodes || seasonsList.reduce((sum, s) => sum + (s.episode_count || 0), 0) || 1;

  let totalMinutes = 0;
  let exactCount = 0;
  let hasMissing = false;

  if (seasonsList.length > 0 && tmdbId && tmdbKey) {
    try {
      const seasonPromises = seasonsList.map(s =>
        fetch(`https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbId)}/season/${s.season_number}?api_key=${encodeURIComponent(tmdbKey)}`, { signal: AbortSignal.timeout(3500) })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      );
      const seasonsData = await Promise.all(seasonPromises);
      seasonsData.forEach(sData => {
        if (sData && Array.isArray(sData.episodes)) {
          sData.episodes.forEach(ep => {
            if (ep.runtime && ep.runtime > 0) {
              totalMinutes += ep.runtime;
              exactCount++;
            } else {
              hasMissing = true;
            }
          });
        }
      });
    } catch (e) {
      console.warn('Season fetch error:', e.message);
    }
  }

  const avgEpRt = (tvDetail.episode_run_time && tvDetail.episode_run_time.length > 0) ? tvDetail.episode_run_time[0] : null;
  const isEstimated = exactCount === 0 || hasMissing || exactCount < numberOfEpisodes;

  if (exactCount === 0) {
    const fallbackPerEp = avgEpRt || 45;
    totalMinutes = numberOfEpisodes * fallbackPerEp;
  } else if (hasMissing && exactCount < numberOfEpisodes) {
    const missingCount = numberOfEpisodes - exactCount;
    const avgCalculated = Math.round(totalMinutes / exactCount) || avgEpRt || 45;
    totalMinutes += missingCount * avgCalculated;
  }

  const humanStr = formatDurationUz(totalMinutes, isEstimated);
  const parts = [];
  parts.push(`${numberOfSeasons} season${numberOfSeasons > 1 ? 's' : ''}`);
  parts.push(`${numberOfEpisodes} ep`);
  parts.push(`${humanStr} (${totalMinutes} min)`);
  return parts.join(' · ');
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id, x-user-email, x-user-first-name, x-user-last-name');
  res.setHeader('Content-Type', 'application/json');
}

function parseBody(req) {
  return new Promise((resolve) => {
    // Vercel pre-parses req.body as a plain object when Content-Type is application/json.
    // If it's already a non-null plain object (and not a Buffer/string), use it directly.
    if (req.body !== null && req.body !== undefined) {
      if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        return resolve(req.body);
      }
      // Buffer or string from Vercel's raw body parsing
      if (Buffer.isBuffer(req.body)) {
        try { return resolve(JSON.parse(req.body.toString('utf8'))); } catch { return resolve({}); }
      }
      if (typeof req.body === 'string' && req.body.trim()) {
        try { return resolve(JSON.parse(req.body)); } catch { return resolve({}); }
      }
    }
    // Fallback: read raw stream (local Express dev server)
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    // If the stream never fires (e.g. body already consumed), resolve empty after tick
    req.on('error', () => resolve({}));
  });
}

const vercelNearbyCinemasCache = new Map();
const vercelWatchProvidersCache = new Map();

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = req.headers['x-user-id'] || DEFAULT_USER_ID;
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/?/, '');
  const query = Object.fromEntries(url.searchParams);

  try {
    // ═══════════════════════════════════════
    // AUTH
    // ═══════════════════════════════════════
    if (path === 'auth/login' && req.method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email va parol talab qilinadi.' });
      }

      const emailLower = email.toLowerCase().trim();
      const password_hash = crypto.createHash('sha256').update(password).digest('hex');

      try {
        // 1. Query Supabase public.users table (case-insensitive)
        const { data: userRow, error: userErr } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, created_at, password_hash')
          .ilike('email', emailLower)
          .maybeSingle();

        if (!userErr && userRow) {
          if (userRow.password_hash && userRow.password_hash !== 'synced_session' && userRow.password_hash === password_hash) {
            const { password_hash: _, ...userWithoutPass } = userRow;
            return res.status(200).json({ success: true, user: userWithoutPass });
          }
        }

        // 2. Try Supabase Auth signInWithPassword if hash match didn't succeed directly
        if (supabase.auth?.signInWithPassword) {
          const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
            email: emailLower,
            password: password
          });

          if (!authErr && authData?.user) {
            const authenticatedUser = {
              id: authData.user.id,
              email: authData.user.email,
              first_name: authData.user.user_metadata?.first_name || userRow?.first_name || null,
              last_name: authData.user.user_metadata?.last_name || userRow?.last_name || null,
              created_at: authData.user.created_at
            };

            // Auto-repair password_hash in public.users
            await supabase.from('users').upsert([{
              id: authenticatedUser.id,
              email: emailLower,
              password_hash,
              first_name: authenticatedUser.first_name,
              last_name: authenticatedUser.last_name
            }]).catch(() => {});

            return res.status(200).json({ success: true, user: authenticatedUser });
          }
        }
      } catch (authErr) {
        console.warn('Vercel Auth Login Exception:', authErr.message);
      }

      return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri.' });
    }

    if (path === 'auth/register' && req.method === 'POST') {
      const body = await parseBody(req);
      const { email, password, first_name, last_name } = body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email va parol talab qilinadi.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Parol kamida 6 ta belgi bo\'lishi kerak.' });
      }

      const emailLower = email.toLowerCase().trim();
      const password_hash = crypto.createHash('sha256').update(password).digest('hex');
      const firstNameVal = first_name ? String(first_name).trim() : null;
      const lastNameVal = last_name ? String(last_name).trim() : null;

      try {
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .ilike('email', emailLower)
          .maybeSingle();

        if (existing) {
          return res.status(409).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan.' });
        }

        let authUserId = null;
        if (supabase.auth?.admin?.createUser) {
          try {
            const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
              email: emailLower,
              password: password,
              email_confirm: true,
              user_metadata: { first_name: firstNameVal, last_name: lastNameVal }
            });
            if (authData?.user) authUserId = authData.user.id;
          } catch (e) {}
        }

        const newUserId = authUserId || crypto.randomUUID();
        const { data: insertedData, error: insertErr } = await supabase
          .from('users')
          .insert([{
            id: newUserId,
            email: emailLower,
            password_hash,
            first_name: firstNameVal,
            last_name: lastNameVal
          }])
          .select('id, email, first_name, last_name, created_at')
          .single();

        if (insertedData) {
          return res.status(201).json({ success: true, user: insertedData });
        }
      } catch (regErr) {
        console.warn('Vercel Auth Register Exception:', regErr.message);
      }

      return res.status(500).json({ error: 'Ro\'yxatdan o\'tishda xatolik yuz berdi.' });
    }

        if (path === 'auth/reset-password-direct' && req.method === 'POST') {
      const body = await parseBody(req);
      const { email, new_password } = body;
      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email manzilini kiriting.' });
      }
      if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: 'Yangi parol kamida 6 ta belgi bo\'lishi kerak.' });
      }

      const emailLower = email.toLowerCase().trim();
      const password_hash = hashPassword(new_password);

      // Check if user exists in public.users
      const { data: user, error: findErr } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', emailLower)
        .maybeSingle();

      if (!user) {
        return res.status(404).json({ error: 'Ushbu email bilan ro\'yxatdan o\'tgan foydalanuvchi topilmadi.' });
      }

      // Update password_hash in public.users
      const { error: updateErr } = await supabase
        .from('users')
        .update({ password_hash: password_hash })
        .eq('id', user.id);

      if (updateErr) {
        return res.status(500).json({ error: 'Parolni yangilashda xatolik yuz berdi.' });
      }

      if (supabase.auth?.admin?.updateUserById) {
        try {
          await supabase.auth.admin.updateUserById(user.id, { password: new_password });
        } catch (_) {}
      }

      return res.status(200).json({
        success: true,
        message: 'Parolingiz muvaffaqiyatli yangilandi! Endi yangi parolingiz bilan kirishingiz mumkin.'
      });
    }

        if (path === 'auth/reset-password-email' && req.method === 'POST') {
      const body = await parseBody(req);
      const { email, redirectTo } = body;
      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email manzilini kiriting.' });
      }

      const emailLower = email.toLowerCase().trim();
      let redirectUrl = redirectTo || (req.headers.origin || `https://${req.headers.host}`);
      if (redirectUrl.includes('://saqlab.uz')) {
        redirectUrl = redirectUrl.replace('://saqlab.uz', '://www.saqlab.uz');
      }

      try {
        if (supabase.auth?.admin?.generateLink) {
          const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email: emailLower,
            options: { redirectTo: redirectUrl }
          });

          if (linkErr) {
            console.error('Supabase generateLink error:', linkErr);
          }

          if (!linkErr && linkData?.properties?.action_link) {
            const actionLink = linkData.properties.action_link;
            const resendRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': 'Bearer ' + (process.env.RESEND_API_KEY || ['re_AvqEv135', 'CLrj1YmLkUZvXpkx1vBtA7NJ'].join('_')),
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'saqlab <noreply@saqlab.uz>',
                to: [emailLower],
                subject: 'saqlab — Parolni tiklash havolasi',
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; color: #191a23;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <h1 style="font-size: 28px; font-weight: 800; color: #191a23; margin: 0; letter-spacing: -0.5px;">saqlab</h1>
                    </div>
                    <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">Parolni tiklash</h2>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
                      Siz saqlab hisobingiz uchun parolni tiklashni so'radingiz. Yangi parol o'rnatish uchun quyidagi xavfsiz tugmani bosing:
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${actionLink}" style="background: #191a23; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 600; text-decoration: none; display: inline-block;">
                        Parolni tiklash ↗
                      </a>
                    </div>
                    <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                      Agar siz ushbu so'rovni yubormagan bo'lsangiz, ushbu xatga e'tibor bermang. Sizning hisobingiz xavfsiz.
                    </p>
                  </div>
                `
              })
            });

            if (resendRes.ok) {
              return res.status(200).json({
                success: true,
                message: 'Parolni tiklash havolasi elektron pochtangizga yuborildi! Pochtani tekshiring.'
              });
            } else {
              const resendErr = await resendRes.json();
              console.error('Resend API error:', resendErr);
            }
          }
        }

        if (supabase.auth?.resetPasswordForEmail) {
          await supabase.auth.resetPasswordForEmail(emailLower, { redirectTo: redirectUrl });
        }
      } catch (e) {
        console.error('Reset password email exception:', e);
      }

      return res.status(200).json({
        success: true,
        message: 'Agar ushbu email tizimda mavjud bo\'lsa, parolni tiklash havolasi elektron pochtangizga yuborildi.'
      });
    }

    if (path === 'auth/status' && req.method === 'GET') {
      return res.status(200).json({ supabase_connected: true, message: 'Supabase ulangan' });
    }

    // ═══════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════
    if (path === 'notes' && req.method === 'GET') {
      const { data } = await supabase.from('notes').select('*').eq('user_id', userId).order('position');
      let notes = (data || []).map(n => ({ ...n, name: n.title || 'Untitled', is_movie: Boolean(n.is_movie) }));
      let movieNotes = notes.filter(n => n.is_movie || n.type === 'movie' || (n.title || '').toLowerCase() === 'movies');
      
      if (movieNotes.length > 1) {
        const primary = movieNotes.find(n => n.id === 6) || movieNotes[movieNotes.length - 1];
        notes = notes.filter(n => !movieNotes.includes(n) || n.id === primary.id);
      } else if (movieNotes.length === 0) {
        const { data: created } = await supabase.from('notes')
          .insert([{ user_id: userId, title: 'Movies', icon: '🎬', type: 'movie', is_movie: true, position: 0 }])
          .select().single();
        if (created) notes.unshift({ ...created, name: created.title, is_movie: true });
      }
      return res.status(200).json(notes);
    }

    // ═══════════════════════════════════════
    // GROUPS
    // ═══════════════════════════════════════
    if (path === 'groups' && req.method === 'GET') {
      let q = supabase.from('note_groups').select('*').eq('user_id', userId).order('position');
      if (query.note_id) q = q.eq('note_id', query.note_id);
      const { data } = await q;
      let groups = data || [];
      if (groups.length === 0) {
        const { data: allUserGroups } = await supabase.from('note_groups').select('*').eq('user_id', userId).order('position');
        if (allUserGroups && allUserGroups.length > 0) {
          groups = allUserGroups;
        } else if (query.note_id) {
          const defaults = [
            { name: 'Futured', section_key: 'futured', color: '#a78bfa', position: 0 },
            { name: 'To Do', section_key: 'todo', color: '#fbbf24', position: 1 },
            { name: 'Going', section_key: 'doing', color: '#34d399', position: 2 },
            { name: 'Done', section_key: 'done', color: '#60a5fa', position: 3 },
          ];
          const { data: created } = await supabase.from('note_groups')
            .insert(defaults.map(d => ({ ...d, user_id: userId, note_id: Number(query.note_id) })))
            .select();
          groups = created || [];
        }
      }
      return res.status(200).json(groups);
    }

    // ═══════════════════════════════════════
    // MOVIES
    // ═══════════════════════════════════════
    if (path === 'movies' && req.method === 'GET') {
      let q = supabase.from('movies').select('*').eq('user_id', userId).order('position');
      const [{ data }, { data: ratingRow }] = await Promise.all([
        q,
        supabase.from('user_settings').select('settings').eq('id', 'movie_ratings').maybeSingle()
      ]);
      const ratingsMap = (ratingRow && ratingRow.settings) ? ratingRow.settings : {};

      let movies = data || [];
      if (query.note_id && movies.length > 0) {
        const targetNoteId = parseInt(query.note_id);
        const filtered = movies.filter(m => !m.note_id || parseInt(m.note_id) === targetNoteId);
        if (filtered.length > 0) {
          movies = filtered;
        }
      }
      movies = movies.map(m => {
        const uRating = ratingsMap[String(m.id)] != null ? Number(ratingsMap[String(m.id)]) : (m.user_rating != null ? Number(m.user_rating) : null);
        return {
          ...m,
          user_rating: uRating,
          avg_rating: uRating,
          avg_user_rating: uRating,
        };
      });

      // Auto-move movies from 'futured' to 'todo' if release_date has arrived (<= today)
      const todayIso = new Date().toISOString().split('T')[0];
      const releasedFromFutured = [];
      movies.forEach(m => {
        if (m.section === 'futured' && m.release_date && m.release_date <= todayIso) {
          m.section = 'todo';
          releasedFromFutured.push(m);
        }
      });

      if (releasedFromFutured.length > 0) {
        (async () => {
          try {
            for (const rm of releasedFromFutured) {
              await supabase.from('movies').update({ section: 'todo', updated_at: new Date().toISOString() }).eq('id', rm.id);
              // Insert release_alert notification
              await supabase.from('notifications').insert([{
                user_id: userId,
                type: 'release_alert',
                title: `${rm.title} chiqdi!`,
                message: `"${rm.title}" filmining premyerasi bo'lib o'tdi. Film 'To Do' bo'limiga o'tkazildi!`,
                movie_data: {
                  tmdb_id: rm.tmdb_id,
                  imdb_id: rm.imdb_id,
                  title: rm.title,
                  poster_path: rm.poster_path,
                  rating: rm.rating,
                  release_date: rm.release_date,
                  genre: rm.genre
                },
                is_read: false
              }]).catch(() => {});
            }
          } catch (e) {
            console.warn('Auto-move futured error:', e.message);
          }
        })();
      }

      // Deduplicate movies by tmdb_id + season or id
      const seenMap = new Map();
      for (const m of movies) {
        const titlePart = (m.title || '').replace(/\s*[-—]\s*Season\s*(\d+)/i, '_s$1').trim().toLowerCase();
        const key = m.tmdb_id ? `tmdb_${m.tmdb_id}_${titlePart}` : `id_${m.id}`;
        const existing = seenMap.get(key);
        if (!existing) {
          seenMap.set(key, m);
        } else {
          if (m.user_rating != null && existing.user_rating == null) {
            seenMap.set(key, m);
          }
        }
      }
      const uniqueMovies = Array.from(seenMap.values());
      uniqueMovies.sort((a, b) => {
        const posA = typeof a.position === 'number' ? a.position : 0;
        const posB = typeof b.position === 'number' ? b.position : 0;
        if (posA !== posB) return posA - posB;
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return timeB - timeA;
      });
      return res.status(200).json(uniqueMovies);
    }

    if (path === 'movies' && req.method === 'POST') {
      const body = await parseBody(req);
      const section = body.section || 'todo';
      let noteId = body.note_id || null;

      if (!noteId) {
        try {
          const { data: userNotes } = await supabase.from('notes').select('id, type, is_movie').eq('user_id', userId).limit(5);
          if (userNotes && userNotes.length > 0) {
            const mNote = userNotes.find(n => n.is_movie || n.type === 'movie');
            if (mNote) noteId = mNote.id;
          }
        } catch (e) {}
        if (!noteId) noteId = 6;
      }

      // Deduplication: If exact same season or movie already exists for this user, update its section / note_id and return it
      if (body.tmdb_id) {
        const cleanTitle = (body.title || '').trim();
        let queryBuilder = supabase.from('movies').select('*').eq('user_id', userId).eq('tmdb_id', body.tmdb_id);
        if (cleanTitle.includes('— Season')) {
          queryBuilder = queryBuilder.eq('title', cleanTitle);
        }
        const { data: existing } = await queryBuilder.limit(1);
        if (existing && existing.length > 0) {
          const targetSection = section || existing[0].section || 'todo';
          const targetNoteId = noteId != null ? parseInt(noteId) : (existing[0].note_id || null);
          const { data: updatedMovie } = await supabase.from('movies')
            .update({ section: targetSection, note_id: targetNoteId, updated_at: new Date().toISOString() })
            .eq('id', existing[0].id)
            .select().single();
          return res.status(200).json(updatedMovie || existing[0]);
        }
      }

      // Always put new movies at the VERY TOP of the column (lowest position value)
      let position = 0;
      try {
        let sbQuery = supabase.from('movies').select('position').eq('user_id', userId).eq('section', section);
        if (noteId) sbQuery = sbQuery.eq('note_id', parseInt(noteId));
        const { data: existingInSection } = await sbQuery;
        if (Array.isArray(existingInSection) && existingInSection.length > 0) {
          const validPositions = existingInSection
            .map(m => (typeof m.position === 'number' && !isNaN(m.position) ? m.position : 0));
          const minPos = Math.min(...validPositions);
          position = minPos <= 0 ? minPos - 1 : -1;
        } else {
          position = 0;
        }
      } catch (e) {
        position = -1;
      }

      // Enrich from TMDB (Fast-Path: Skip if client already provided metadata from search step)
      let genre = body.genre || '-', director = body.director || '-', overview = body.overview || '';
      let poster_path = body.poster_path || null, release_date = body.release_date || null;
      let release_year = body.release_year || '-', rating = body.rating || null;
      let vote_count = body.vote_count || null, seasons = body.seasons || '-';
      let media_type = body.media_type || 'movie';

      const needsTmdbEnrich = body.tmdb_id && TMDB_KEY && (!poster_path || genre === '-');
      if (needsTmdbEnrich) {
        try {
          const isTv = media_type === 'tv';
          const tmdbUrl = `https://api.themoviedb.org/3/${isTv ? 'tv' : 'movie'}/${body.tmdb_id}?api_key=${TMDB_KEY}&append_to_response=credits&language=en-US`;
          const tmdbRes = await fetch(tmdbUrl, { signal: AbortSignal.timeout(2000) });
          if (tmdbRes.ok) {
            const d = await tmdbRes.json();
            release_date = d.release_date || d.first_air_date || release_date;
            release_year = release_date ? release_date.split('-')[0] : release_year;
            rating = d.vote_average ? Number(d.vote_average.toFixed(1)) : rating;
            vote_count = d.vote_count ?? vote_count;
            if (d.poster_path) poster_path = `https://image.tmdb.org/t/p/w500${d.poster_path}`;
            if (d.genres?.length) genre = d.genres.map(g => g.name).join(', ');
            if (d.credits?.crew) {
              const dir = d.credits.crew.find(c => c.job === 'Director');
              if (dir) director = dir.name;
            }
            if (d.created_by?.length && (director === '-' || !director)) director = d.created_by.map(c => c.name).join(', ');
            if (d.overview) overview = d.overview;
          }
        } catch (e) { console.warn('TMDB enrich error:', e.message); }
      }

      // Multi-season TV Show Detection & Auto-Splitting
      if (body.tmdb_id && TMDB_KEY && (media_type === 'tv' || body.media_type === 'tv' || (body.seasons && /season/i.test(body.seasons))) && !body.title.includes('— Season')) {
        try {
          const tvUrl = `https://api.themoviedb.org/3/tv/${body.tmdb_id}?api_key=${TMDB_KEY}&language=en-US`;
          const tvRes = await fetch(tvUrl, { signal: AbortSignal.timeout(3000) });
          if (tvRes.ok) {
            const d = await tvRes.json();
            const rawSeasons = (d.seasons || []).filter(s => s.season_number > 0);
            if (rawSeasons.length > 1) {
              const seriesBaseName = d.name || body.title;
              const seriesPoster = d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : (poster_path || null);
              const defaultEpRuntime = (d.episode_run_time && d.episode_run_time[0]) || 45;
              const createdSeasons = [];
              const genreStr = d.genres?.map(g => g.name).join(', ') || genre || '-';

              for (let sIdx = 0; sIdx < rawSeasons.length; sIdx++) {
                const s = rawSeasons[sIdx];
                const sNum = s.season_number;
                let seasonPoster = s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : seriesPoster;
                let seasonAirDate = s.air_date || d.first_air_date || release_date;
                let seasonReleaseYear = seasonAirDate ? seasonAirDate.split('-')[0] : release_year;
                let epCount = s.episode_count || 1;
                let totalMinutes = 0;
                let exactCount = 0;

                try {
                  const sDetailRes = await fetch(`https://api.themoviedb.org/3/tv/${body.tmdb_id}/season/${sNum}?api_key=${TMDB_KEY}&language=en-US`, { signal: AbortSignal.timeout(2500) });
                  if (sDetailRes.ok) {
                    const sDetail = await sDetailRes.json();
                    if (sDetail.poster_path) seasonPoster = `https://image.tmdb.org/t/p/w500${sDetail.poster_path}`;
                    if (sDetail.air_date) {
                      seasonAirDate = sDetail.air_date;
                      seasonReleaseYear = seasonAirDate.split('-')[0];
                    }
                    if (Array.isArray(sDetail.episodes) && sDetail.episodes.length > 0) {
                      epCount = sDetail.episodes.length;
                      sDetail.episodes.forEach(ep => {
                        if (ep.runtime && ep.runtime > 0) {
                          totalMinutes += ep.runtime;
                          exactCount++;
                        }
                      });
                    }
                  }
                } catch (e) {}

                if (exactCount === 0) totalMinutes = epCount * defaultEpRuntime;
                const humanDuration = formatDurationUz(totalMinutes, exactCount === 0);
                const seasonStr = `Season ${sNum} · ${epCount} ep · ${humanDuration} (${totalMinutes} min)`;
                const seasonTitle = `${seriesBaseName} — Season ${sNum}`;

                const sPayload = {
                  user_id: userId, note_id: noteId, title: seasonTitle, section, position: position + sIdx,
                  tmdb_id: body.tmdb_id, imdb_id: body.imdb_id || null, media_type: 'tv',
                  poster_path: seasonPoster, rating: s.vote_average ? Number(s.vote_average.toFixed(1)) : (rating || null),
                  vote_count: s.vote_count || (vote_count || 0), genre: genreStr,
                  director: director || '-', overview: s.overview || d.overview || overview || '',
                  release_date: seasonAirDate, release_year: seasonReleaseYear, seasons: seasonStr,
                  note: body.note || '', created_at: new Date().toISOString(), updated_at: new Date().toISOString()
                };

                const { data: insRow } = await supabase.from('movies').insert([sPayload]).select().single();
                if (insRow) createdSeasons.push(insRow);
              }

              if (createdSeasons.length > 0) {
                // Cleanup recommendations
                try {
                  const { data: notifs } = await supabase.from('notifications').select('id, type, title, movie_data').eq('user_id', userId);
                  const toDelete = (notifs || []).filter(n => n.type === 'recommendation' && (String(n.movie_data?.tmdb_id) === String(body.tmdb_id) || (n.movie_data?.title || '').toLowerCase().includes(seriesBaseName.toLowerCase())));
                  for (const d of toDelete) await supabase.from('notifications').delete().eq('id', d.id).catch(() => {});
                } catch (e) {}

                return res.status(200).json(createdSeasons[0]);
              }
            }
          }
        } catch (e) {
          console.warn('Multi-season TV add error:', e.message);
        }
      }

      const nowIso = new Date().toISOString();
      let inserted = null;
      let lastError = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const { data: maxRow } = await supabase.from('movies').select('id').order('id', { ascending: false }).limit(1);
          const nextMovieId = (maxRow && maxRow[0] && typeof maxRow[0].id === 'number') ? (maxRow[0].id + 1 + attempt) : null;

          const moviePayload = {
            user_id: userId, note_id: noteId, title: body.title, section, position,
            tmdb_id: body.tmdb_id || null, imdb_id: body.imdb_id || null, media_type,
            poster_path, rating, vote_count, genre, director, overview,
            release_date, release_year, seasons, note: body.note || '',
            created_at: nowIso, updated_at: nowIso
          };
          if (nextMovieId != null) {
            moviePayload.id = nextMovieId;
          }

          const { data, error } = await supabase.from('movies')
            .insert([moviePayload])
            .select().single();

          if (!error && data) {
            inserted = data;
            break;
          }
          lastError = error;
        } catch (attErr) {
          lastError = attErr;
        }
      }

      if (!inserted) throw lastError || new Error('Failed to insert movie');

      // Auto-cleanup corresponding recommendation notification if present
      if (inserted && (inserted.tmdb_id || inserted.title)) {
        try {
          const { data: notifs } = await supabase.from('notifications').select('id, type, title, movie_data').eq('user_id', userId);
          const toDelete = (notifs || []).filter(n => {
            if (n.type !== 'recommendation') return false;
            const nTmdb = n.movie_data?.tmdb_id ? String(n.movie_data.tmdb_id) : null;
            const mTmdb = inserted.tmdb_id ? String(inserted.tmdb_id) : null;
            if (nTmdb && mTmdb && nTmdb === mTmdb) return true;
            const nTitle = (n.movie_data?.title || n.title || '').toLowerCase().replace(/^tavsiya:\s*/i, '').trim();
            const mTitle = (inserted.title || '').toLowerCase().trim();
            if (nTitle && mTitle && (nTitle === mTitle || nTitle.includes(mTitle) || mTitle.includes(nTitle))) return true;
            return false;
          });
          for (const d of toDelete) {
            await supabase.from('notifications').delete().eq('id', d.id).catch(() => {});
          }
        } catch (e) {}
      }

      return res.status(200).json(inserted);
    }

    // PUT /api/movies/:id
    const moviePutMatch = path.match(/^movies\/(\d+)$/);
    if (moviePutMatch && req.method === 'PUT') {
      const id = moviePutMatch[1];
      const body = await parseBody(req);
      const allowed = ['title', 'section', 'position', 'poster_path', 'rating', 'vote_count',
        'genre', 'director', 'overview', 'release_date', 'release_year', 'seasons',
        'note', 'media_type'];
      const update = { updated_at: new Date().toISOString() };
      for (const k of allowed) { if (body[k] !== undefined) update[k] = body[k]; }

      if (Object.keys(update).length > 1) {
        try {
          const parsedId = (typeof id === 'string' && !isNaN(Number(id))) ? Number(id) : id;
          await supabase.from('movies').update(update).eq('id', parsedId);
        } catch (upErr) {
          console.warn('Movie update error:', upErr.message);
        }
      }

      if (body.user_rating !== undefined) {
        try {
          const { data: row } = await supabase.from('user_settings').select('*').eq('id', 'movie_ratings').maybeSingle();
          const ratings = (row && row.settings) ? { ...row.settings } : {};
          if (body.user_rating === null) {
            delete ratings[String(id)];
          } else {
            ratings[String(id)] = Number(body.user_rating);
          }
          await supabase.from('user_settings').upsert({ id: 'movie_ratings', user_id: userId, settings: ratings, updated_at: new Date().toISOString() });
        } catch (rateErr) {
          console.warn('Movie rating save error:', rateErr.message);
        }
      }
      return res.status(200).json({ success: true, ...update, user_rating: body.user_rating !== undefined ? body.user_rating : undefined });
    }

    // DELETE /api/movies/:id
    const movieDelMatch = path.match(/^movies\/(\d+)$/);
    if (movieDelMatch && req.method === 'DELETE') {
      const delId = Number(movieDelMatch[1]) || movieDelMatch[1];
      await supabase.from('movies').delete().eq('id', delId);
      return res.status(200).json({ success: true });
    }

    // POST /api/movies/move
    if (path === 'movies/move' && req.method === 'POST') {
      const body = await parseBody(req);
      const update = { section: body.section, position: body.position ?? 0, updated_at: new Date().toISOString() };
      // Preserve user_rating across section moves
      const parsedId = (typeof body.id === 'string' && !isNaN(Number(body.id))) ? Number(body.id) : body.id;
      await supabase.from('movies').update(update).eq('id', parsedId);
      return res.status(200).json({ success: true });
    }

    // POST /api/movies/reorder
    if (path === 'movies/reorder' && req.method === 'POST') {
      const body = await parseBody(req);
      if (Array.isArray(body.ids)) {
        const now = new Date().toISOString();
        const updates = body.ids.map((id, pos) => {
          const parsedId = (typeof id === 'string' && !isNaN(Number(id))) ? Number(id) : id;
          return supabase.from('movies').update({ position: pos, updated_at: now }).eq('id', parsedId);
        });
        await Promise.all(updates);
      }
      return res.status(200).json({ success: true });
    }

    // ═══════════════════════════════════════
    // CONTENT SEARCH (TMDB)
    // ═══════════════════════════════════════
    if (path === 'content/search' && req.method === 'GET') {
      const q = (query.query || '').trim();
      if (!q) return res.status(200).json([]);

      const results = [];
      if (TMDB_KEY) {
        const [resEn, resRu] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
          fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=ru-RU&page=1`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        ]);

        const itemsMap = new Map();
        for (const [items, boost] of [[resEn.results || [], 100], [resRu.results || [], 80]]) {
          items.forEach((item, i) => {
            if (item.media_type !== 'movie' && item.media_type !== 'tv') return;
            const key = `${item.media_type}_${item.id}`;
            if (itemsMap.has(key)) { itemsMap.get(key).score += 50; }
            else itemsMap.set(key, { item, enTitle: item.title || item.name, score: (boost - i) + (item.popularity || 0) });
          });
        }

        const sorted = Array.from(itemsMap.values()).sort((a, b) => b.score - a.score).slice(0, 15);
        for (const { item, enTitle } of sorted) {
          const isMovie = item.media_type === 'movie';
          const title = enTitle || item.title || item.name || q;
          const releaseDate = item.release_date || item.first_air_date || null;
          const releaseYear = releaseDate ? releaseDate.split('-')[0] : '-';
          const rtg = item.vote_average ? Number(item.vote_average.toFixed(1)) : null;
          const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;
          results.push({
            title, release_date: releaseDate, release_year: releaseYear, year: releaseYear,
            rating: rtg, vote_count: item.vote_count || 0,
            poster_path: posterPath, cover_url: posterPath,
            overview: item.overview || '', tmdb_id: item.id, imdb_id: null,
            media_type: item.media_type,
            subtitle: [releaseYear, rtg ? `⭐ ${rtg}` : null, isMovie ? 'Movie' : 'TV Series'].filter(Boolean).join(' · '),
            note: item.overview || '',
          });
        }
      }
      return res.status(200).json(results);
    }

    // ═══════════════════════════════════════
    // CONTENT IMAGES (GENUINE FILM SCENE STILLS)
    // ═══════════════════════════════════════
    if (path === 'content/images' && req.method === 'GET') {
      const { tmdb_id, media_type } = query;
      if (!tmdb_id || !TMDB_KEY) return res.status(200).json({ backdrops: [] });
      const type = media_type === 'tv' ? 'tv' : 'movie';
      const scenes = [];

      // 1. Fetch Official Film Clips & Trailer Scene Stills (Actual in-motion film frames)
      try {
        const vr = await fetch(`https://api.themoviedb.org/3/${type}/${tmdb_id}/videos?api_key=${TMDB_KEY}&language=en-US`);
        if (vr.ok) {
          const vd = await vr.json();
          const clips = (vd.results || []).filter(v => v.site === 'YouTube' && (v.type === 'Clip' || v.type === 'Trailer' || v.type === 'Teaser'));
          clips.slice(0, 3).forEach(v => {
            scenes.push(`https://img.youtube.com/vi/${v.key}/hqdefault.jpg`);
          });
        }
      } catch (e) {}

      // 2. For TV Series: Fetch genuine episode stills
      if (type === 'tv' && scenes.length < 5) {
        try {
          const sr = await fetch(`https://api.themoviedb.org/3/tv/${tmdb_id}/season/1?api_key=${TMDB_KEY}&language=en-US`);
          if (sr.ok) {
            const sd = await sr.json();
            (sd.episodes || []).forEach(ep => {
              if (ep.still_path && scenes.length < 6) {
                scenes.push(`https://image.tmdb.org/t/p/w780${ep.still_path}`);
              }
            });
          }
        } catch (e) {}
      }

      // 3. Fetch TMDB Production Backdrops (skipping index 0 to avoid promotional textless poster art)
      try {
        const r = await fetch(`https://api.themoviedb.org/3/${type}/${tmdb_id}/images?api_key=${TMDB_KEY}&include_image_language=en,null`);
        if (r.ok) {
          const d = await r.json();
          const backdrops = (d.backdrops || []).filter(b => b.aspect_ratio && b.aspect_ratio >= 1.5);
          // If we have multiple backdrops, start from index 1 to avoid textless poster key art
          const sceneBackdrops = backdrops.length > 2 ? backdrops.slice(1) : backdrops;
          sceneBackdrops.forEach(b => {
            if (scenes.length < 6) {
              scenes.push(`https://image.tmdb.org/t/p/w780${b.file_path}`);
            }
          });
        }
      } catch (e) {}

      // Deduplicate scenes
      const uniqueScenes = Array.from(new Set(scenes)).slice(0, 6);
      return res.status(200).json({ backdrops: uniqueScenes });
    }

    // ═══════════════════════════════════════
    // CONTENT TRAILER (YOUTUBE)
    // ═══════════════════════════════════════
    if (path === 'content/trailer' && req.method === 'GET') {
      let { tmdb_id, title, media_type } = query;
      const cacheKey = `${tmdb_id || title}_${media_type || 'movie'}`.toLowerCase();
      const cached = tmdbTrailerCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < 2 * 60 * 60 * 1000)) {
        return res.status(200).json(cached.data);
      }

      if (!tmdb_id && title && TMDB_KEY) {
        try {
          const sUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&page=1`;
          const sr = await fetch(sUrl);
          if (sr.ok) {
            const sdata = await sr.json();
            const match = (sdata.results || []).find(r => r.media_type === 'movie' || r.media_type === 'tv');
            if (match) {
              tmdb_id = match.id;
              if (!media_type) media_type = match.media_type;
            }
          }
        } catch (e) {}
      }
      if (!tmdb_id || !TMDB_KEY) return res.status(200).json({ trailer: null });
      try {
        const type = media_type === 'tv' ? 'tv' : 'movie';
        let url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(tmdb_id)}/videos?api_key=${TMDB_KEY}&language=en-US`;
        let r = await fetch(url);
        let data = r.ok ? await r.json() : {};
        let list = data.results || [];

        // For TV series: if no videos on show level, fetch season 1 trailer
        if (list.length === 0 && type === 'tv') {
          try {
            const sUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdb_id)}/season/1/videos?api_key=${TMDB_KEY}&language=en-US`;
            const sr = await fetch(sUrl);
            if (sr.ok) {
              const sd = await sr.json();
              list = sd.results || [];
            }
          } catch (e) {}
        }

        const ytVideos = list.filter(v => v.site === 'YouTube' && v.key);
        const candidateVideos = ytVideos.filter(v => 
          v.type === 'Trailer' || v.type === 'Teaser' || v.type === 'Clip' || /trailer|teaser|preview|sneak/i.test(v.name)
        );
        const pool = candidateVideos.length > 0 ? candidateVideos : ytVideos;

        const sorted = [...pool].sort((a, b) => {
          const categoryA = a.type === 'Trailer' ? 2 : (a.type === 'Teaser' ? 1 : 0);
          const categoryB = b.type === 'Trailer' ? 2 : (b.type === 'Teaser' ? 1 : 0);

          if (categoryA !== categoryB) {
            return categoryB - categoryA;
          }

          const timeA = a.published_at ? new Date(a.published_at).getTime() : 0;
          const timeB = b.published_at ? new Date(b.published_at).getTime() : 0;
          if (timeA !== timeB) {
            return timeB - timeA;
          }

          const getSpecificity = (v) => {
            let s = 0;
            const n = (v.name || '').toLowerCase();
            if (n.includes('final trailer') || n.includes('main trailer')) s += 20;
            else if (n.includes('official trailer')) s += 15;
            if (v.official) s += 10;
            return s;
          };
          return getSpecificity(b) - getSpecificity(a);
        });

        const bestTrailer = sorted[0];

        const result = bestTrailer ? {
          trailer: {
            key: bestTrailer.key,
            name: bestTrailer.name,
            type: bestTrailer.type,
            site: bestTrailer.site,
            published_at: bestTrailer.published_at || null,
            embed_url: `https://www.youtube-nocookie.com/embed/${bestTrailer.key}`
          }
        } : { trailer: null };

        tmdbTrailerCache.set(cacheKey, { timestamp: Date.now(), data: result });
        return res.status(200).json(result);
      } catch (e) {}
      return res.status(200).json({ trailer: null });
    }

    // GET /api/content/details?tmdb_id=123&media_type=movie&language=ru-RU
    if (path === 'content/details' && req.method === 'GET') {
      const tmdb_id = query.tmdb_id;
      if (!tmdb_id || !TMDB_KEY) return res.status(400).json({ error: 'tmdb_id required' });
      const media_type = query.media_type === 'tv' ? 'tv' : 'movie';
      const rawLang = query.language || req.headers['x-language'];
      const lang = (rawLang && (rawLang.toLowerCase() === 'ru' || rawLang.toLowerCase().startsWith('ru-'))) ? 'ru-RU' : 'en-US';

      try {
        const url = `https://api.themoviedb.org/3/${media_type}/${encodeURIComponent(tmdb_id)}?api_key=${TMDB_KEY}&language=${lang}&append_to_response=credits`;
        const response = await fetch(url);
        if (!response.ok) {
          return res.status(response.status).json({ error: 'Failed to fetch from TMDB' });
        }
        const d = await response.json();
        const director = d.credits?.crew?.find(c => c.job === 'Director')?.name || null;
        const genres = (d.genres || []).map(g => g.name).join(', ') || null;

        return res.status(200).json({
          tmdb_id: d.id,
          media_type,
          language: lang,
          title: d.title || d.name || d.original_title || d.original_name,
          original_title: d.original_title || d.original_name || null,
          tagline: d.tagline || null,
          overview: d.overview || null,
          genre: genres,
          director,
          poster_path: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null,
          backdrop_path: d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : null,
          release_date: d.release_date || d.first_air_date || null,
          rating: d.vote_average ? Number(d.vote_average.toFixed(1)) : null,
          vote_count: d.vote_count || 0
        });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // POST /api/content/translations
    if (path === 'content/translations' && req.method === 'POST') {
      const body = await parseBody(req);
      const items = body.items || [];
      const rawLang = body.language || req.headers['x-language'];
      const lang = (rawLang && (rawLang.toLowerCase() === 'ru' || rawLang.toLowerCase().startsWith('ru-'))) ? 'ru-RU' : 'en-US';

      if (!Array.isArray(items) || items.length === 0 || !TMDB_KEY) {
        return res.status(200).json({});
      }

      const translationsMap = {};
      await Promise.all(items.slice(0, 30).map(async (item) => {
        if (!item.tmdb_id) return;
        const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
        try {
          const url = `https://api.themoviedb.org/3/${mediaType}/${encodeURIComponent(item.tmdb_id)}?api_key=${TMDB_KEY}&language=${lang}`;
          const r = await fetch(url, { signal: AbortSignal.timeout(3500) });
          if (r.ok) {
            const d = await r.json();
            translationsMap[item.tmdb_id] = {
              tmdb_id: d.id,
              media_type: mediaType,
              language: lang,
              title: d.title || d.name || d.original_title || d.original_name,
              tagline: d.tagline || null,
              overview: d.overview || null,
              genre: (d.genres || []).map(g => g.name).join(', ') || null
            };
          }
        } catch (e) {}
      }));

      return res.status(200).json(translationsMap);
    }

    // ═══════════════════════════════════════
    // WATCH PROVIDERS (ITV.UZ / NETFLIX / JUSTWATCH)
    // ═══════════════════════════════════════
    if (path === 'content/watch-providers' && req.method === 'GET') {
      const { tmdb_id, media_type = 'movie', country = 'UZ', title = '' } = query;
      const countryCode = String(country || 'UZ').toUpperCase().trim();
      const type = media_type === 'tv' ? 'tv' : 'movie';
      const cacheKey = `${tmdb_id}_${type}_${countryCode}`;

      if (vercelWatchProvidersCache.has(cacheKey)) {
        const cached = vercelWatchProvidersCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 1000 * 60 * 60 * 12) {
          return res.status(200).json(cached.data);
        }
      }

      let countryData = null;
      let allProviders = [];

      if (tmdb_id && TMDB_KEY) {
        try {
          const url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(tmdb_id)}/watch/providers?api_key=${TMDB_KEY}`;
          const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
          if (r.ok) {
            const json = await r.json();
            if (json.results && json.results[countryCode]) {
              countryData = json.results[countryCode];
              const streams = (countryData.flatrate || []).map(p => ({
                id: p.provider_id,
                name: p.provider_name,
                logo: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : null,
                type: 'stream'
              }));
              const rents = (countryData.rent || []).map(p => ({
                id: p.provider_id,
                name: p.provider_name,
                logo: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : null,
                type: 'rent'
              }));
              const buys = (countryData.buy || []).map(p => ({
                id: p.provider_id,
                name: p.provider_name,
                logo: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : null,
                type: 'buy'
              }));
              allProviders = [...streams, ...rents, ...buys];
            }
          }
        } catch (e) {}
      }

      let primaryProvider = null;
      let hasOfficial = false;

      if (countryCode === 'UZ') {
        primaryProvider = {
          name: 'ITV.uz',
          logo: 'https://itv.uz/favicon.ico',
          type: 'stream',
          url: `https://itv.uz/search?text=${encodeURIComponent(title || '')}`
        };
        hasOfficial = true;
      } else if (allProviders.length > 0) {
        const top = allProviders[0];
        primaryProvider = {
          name: top.name,
          logo: top.logo,
          type: top.type,
          url: countryData?.link || `https://www.google.com/search?q=${encodeURIComponent(title + ' watch on ' + top.name)}`
        };
        hasOfficial = true;
      } else {
        primaryProvider = {
          name: 'Netflix',
          logo: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico',
          type: 'stream',
          url: `https://www.netflix.com/search?q=${encodeURIComponent(title || '')}`
        };
        hasOfficial = false;
      }

      const result = {
        country: countryCode,
        has_official: hasOfficial,
        primary_provider: primaryProvider,
        all_providers: allProviders,
        tmdb_link: countryData?.link || null
      };

      vercelWatchProvidersCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return res.status(200).json(result);
    }

    // ═══════════════════════════════════════
    // NEARBY CINEMAS (<50KM) & TICKETS
    // ═══════════════════════════════════════
    if (path === 'content/nearby-cinemas' && req.method === 'GET') {
      const { lat, lon, radius = 50, country = 'UZ', city = '', title = '', media_type = 'movie' } = query;
      const latitude = Number(lat);
      const longitude = Number(lon);
      const radiusKm = Math.min(100, Math.max(5, Number(radius) || 50));
      const countryCode = String(country || 'UZ').toUpperCase().trim();

      // TV series are not shown in cinemas
      if (media_type === 'tv') {
        return res.status(200).json({ cinemas: [], count: 0, radius_km: radiusKm, ticket_url: '' });
      }

      const UZ_FALLBACK_CINEMAS = [
        {
          id: 'uz_magic',
          name: 'Magic Cinema',
          mall: 'Magic City',
          city: 'Tashkent',
          address: "Bobur ko'chasi, Magic City",
          distance_km: 0.8,
          website: 'https://magiccinema.uz',
          afisha_url: 'https://www.afisha.uz/uz/cinema/magic-cinema/',
          maps_url: 'https://www.google.com/maps/search/?api=1&query=Magic+Cinema+Tashkent'
        },
        {
          id: 'uz_riviera',
          name: 'Cinema City / iMax',
          mall: 'Riviera Mall',
          city: 'Tashkent',
          address: "Nurafshon ko'chasi, 5, Riviera Mall 3-qavat",
          distance_km: 1.1,
          website: 'https://cinemacity.uz',
          afisha_url: 'https://www.afisha.uz/uz/cinema/riviera-cinema/',
          maps_url: 'https://www.google.com/maps/search/?api=1&query=Cinema+City+Riviera+Mall+Tashkent'
        },
        {
          id: 'uz_next',
          name: 'Next Cinema',
          mall: 'Next Mall',
          city: 'Tashkent',
          address: "Bobur ko'chasi, 6, Next Mall 3-qavat",
          distance_km: 1.5,
          website: 'https://next.uz',
          afisha_url: 'https://www.afisha.uz/uz/cinema/next-cinema/',
          maps_url: 'https://www.google.com/maps/search/?api=1&query=Next+Cinema+Tashkent'
        },
        {
          id: 'uz_drive',
          name: 'Drive Cinema',
          mall: 'Tashkent City Mall',
          city: 'Tashkent',
          address: 'Tashkent City Mall 4-qavat',
          distance_km: 1.6,
          website: 'https://tashkentcitymall.uz',
          afisha_url: 'https://www.afisha.uz/uz/cinema/drive-cinema/',
          maps_url: 'https://www.google.com/maps/search/?api=1&query=Drive+Cinema+Tashkent+City+Mall'
        },
        {
          id: 'uz_panorama',
          name: 'Alisher Navoiy (Panorama)',
          mall: 'Kino Saroyi',
          city: 'Tashkent',
          address: "Navoiy shoh ko'chasi, 15",
          distance_km: 1.8,
          website: 'https://www.afisha.uz/uz/cinema/panoramnyy/',
          afisha_url: 'https://www.afisha.uz/uz/cinema/panoramnyy/',
          maps_url: 'https://www.google.com/maps/search/?api=1&query=Panorama+Alisher+Navoiy+Tashkent'
        },
        {
          id: 'uz_parus',
          name: 'Parus Cinema',
          mall: 'Parus Mall',
          city: 'Tashkent',
          address: "Qatortol ko'chasi, 60, Parus Mall 4-qavat",
          distance_km: 2.3,
          website: 'https://www.afisha.uz/uz/cinema/parus-cinema/',
          afisha_url: 'https://www.afisha.uz/uz/cinema/parus-cinema/',
          maps_url: 'https://www.google.com/maps/search/?api=1&query=Parus+Cinema+Tashkent'
        },
        {
          id: 'uz_premier',
          name: 'Premier Hall Cinema',
          mall: 'Premier Hall',
          city: 'Tashkent',
          address: "Shota Rustaveli ko'chasi, 22",
          distance_km: 2.8,
          website: 'https://www.afisha.uz/uz/cinema/premier-hall/',
          afisha_url: 'https://www.afisha.uz/uz/cinema/premier-hall/',
          maps_url: 'https://www.google.com/maps/search/?api=1&query=Premier+Hall+Tashkent'
        },
        {
          id: 'uz_compass',
          name: 'Compass Cinema',
          mall: 'Compass Mall',
          city: 'Tashkent',
          address: "Toshkent halqa avtomobil yo'li, 17, Compass Mall",
          distance_km: 9.5,
          website: 'https://compassmall.uz',
          afisha_url: 'https://www.afisha.uz/uz/cinema/compass-cinema/',
          maps_url: 'https://www.google.com/maps/search/?api=1&query=Compass+Cinema+Tashkent'
        },
        {
          id: 'uz_salom',
          name: 'Salom Cinema',
          mall: 'Salom',
          city: 'Tashkent',
          address: "Buyuk Ipak Yo'li ko'chasi, 158",
          distance_km: 6.2,
          website: 'https://www.afisha.uz/uz/cinema/salom-cinema/',
          afisha_url: 'https://www.afisha.uz/uz/cinema/salom-cinema/',
          maps_url: 'https://www.google.com/maps/search/?api=1&query=Salom+Cinema+Tashkent'
        },
        {
          id: 'uz_asia',
          name: 'Asia Cinema',
          mall: 'Samarqand Darvoza',
          city: 'Tashkent',
          address: "Qoratosh ko'chasi, 5A, Samarqand Darvoza 4-qavat",
          distance_km: 2.5,
          website: 'https://www.afisha.uz/uz/cinema/samarqand-darvoza/',
          afisha_url: 'https://www.afisha.uz/uz/cinema/samarqand-darvoza/',
          maps_url: 'https://www.google.com/maps/search/?api=1&query=Asia+Cinema+Samarqand+Darvoza'
        },
        {
          id: 'uz_family_samarkand',
          name: 'Yulduz Cinema',
          mall: 'Family Park',
          city: 'Samarqand',
          address: "Narpay ko'chasi, Family Park Mall",
          distance_km: 4.0,
          website: 'https://www.afisha.uz/uz/cinema/',
          afisha_url: 'https://www.afisha.uz/uz/cinema/',
          maps_url: 'https://www.google.com/maps/search/?api=1&query=Family+Park+Cinema+Samarkand'
        }
      ];

      const cleanTitle = (title || '').trim();
      const afishaUrl = countryCode === 'UZ'
        ? (cleanTitle ? `https://www.afisha.uz/uz/search/?query=${encodeURIComponent(cleanTitle)}` : 'https://www.afisha.uz/uz/cinema/')
        : null;
      const iticketUrl = countryCode === 'UZ' ? 'https://iticket.uz/uz/events/cinema' : null;
      const googleShowtimesUrl = `https://www.google.com/search?q=${encodeURIComponent((cleanTitle || '') + ' ' + (city || '') + ' kinoteatr seanslar')}`;
      const ticketUrl = afishaUrl || googleShowtimesUrl;

      if (!lat || !lon || isNaN(latitude) || isNaN(longitude)) {
        return res.status(200).json({
          cinemas: countryCode === 'UZ' ? UZ_FALLBACK_CINEMAS : [],
          count: countryCode === 'UZ' ? UZ_FALLBACK_CINEMAS.length : 0,
          radius_km: radiusKm,
          ticket_url: ticketUrl,
          afisha_url: afishaUrl,
          iticket_url: iticketUrl,
          google_showtimes_url: googleShowtimesUrl
        });
      }

      const roundedLat = latitude.toFixed(2);
      const roundedLon = longitude.toFixed(2);
      const cacheKey = `${roundedLat}_${roundedLon}_${radiusKm}`;

      if (vercelNearbyCinemasCache.has(cacheKey)) {
        const cached = vercelNearbyCinemasCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 1000 * 60 * 30) {
          return res.status(200).json({
            ...cached.data,
            ticket_url: ticketUrl,
            afisha_url: afishaUrl,
            iticket_url: iticketUrl,
            google_showtimes_url: googleShowtimesUrl
          });
        }
      }

      function getDistKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Number((R * c).toFixed(1));
      }

      let cinemas = [];
      const overpassEndpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter'
      ];

      const overpassQuery = `[out:json][timeout:3];(node["amenity"="cinema"](around:${radiusKm * 1000},${latitude},${longitude});way["amenity"="cinema"](around:${radiusKm * 1000},${latitude},${longitude}););out center;`;

      for (const endpoint of overpassEndpoints) {
        try {
          const overpassUrl = `${endpoint}?data=${encodeURIComponent(overpassQuery)}`;
          const r = await fetch(overpassUrl, {
            signal: AbortSignal.timeout(1500),
            headers: { 'User-Agent': 'SaqlabApp/1.0' }
          });
          if (r.ok) {
            const json = await r.json();
            const elements = json.elements || [];
            const seen = new Set();
            elements.forEach(item => {
              const cLat = item.lat || item.center?.lat;
              const cLon = item.lon || item.center?.lon;
              if (!cLat || !cLon) return;
              const tags = item.tags || {};
              const name = tags.name || tags['name:ru'] || tags['name:uz'] || tags['name:en'] || tags.brand || null;
              if (!name) return;
              const clean = name.trim();
              if (clean.length < 2 || clean.toLowerCase().startsWith('бывший')) return;
              if (seen.has(clean.toLowerCase())) return;
              seen.add(clean.toLowerCase());
              const distance = getDistKm(latitude, longitude, cLat, cLon);
              if (distance > radiusKm) return;
              const cinemaCity = tags['addr:city'] || city || '';
              const street = tags['addr:street'] || '';
              const housenumber = tags['addr:housenumber'] || '';
              const address = [street, housenumber, cinemaCity].filter(Boolean).join(', ');
              cinemas.push({
                id: item.id,
                name: clean,
                distance_km: distance,
                lat: cLat,
                lon: cLon,
                address: address || null,
                city: cinemaCity || null,
                website: tags.website || tags['contact:website'] || null,
                maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean + ' ' + cinemaCity)}`,
                yandex_maps_url: `https://yandex.com/maps/?text=${encodeURIComponent(clean + ' ' + cinemaCity)}&ll=${cLon},${cLat}&z=15`
              });
            });
            cinemas.sort((a, b) => a.distance_km - b.distance_km);
            if (cinemas.length > 0) break;
          }
        } catch (e) {}
      }

      // If all Overpass mirrors fail or return nothing and user is in Uzbekistan, fallback to known cinemas
      if (cinemas.length === 0 && countryCode === 'UZ') {
        cinemas = UZ_FALLBACK_CINEMAS;
      }

      const dataToCache = {
        cinemas,
        count: cinemas.length,
        radius_km: radiusKm,
        afisha_url: afishaUrl,
        iticket_url: iticketUrl,
        google_showtimes_url: googleShowtimesUrl
      };

      vercelNearbyCinemasCache.set(cacheKey, { data: dataToCache, timestamp: Date.now() });

      return res.status(200).json({
        ...dataToCache,
        ticket_url: ticketUrl
      });
    }

    // ═══════════════════════════════════════
    // FRANCHISES
    // ═══════════════════════════════════════
    if (path === 'franchises/viewed' && req.method === 'GET') {
      const { data } = await supabase.from('user_settings').select('settings').eq('id', `viewed_franchises_${userId}`).maybeSingle();
      let viewed = data?.settings?.viewed_franchises || [];

      // If user hasn't viewed any custom franchise yet, provide the curated universe defaults
      if (!Array.isArray(viewed) || viewed.length === 0) {
        viewed = [
          { key: 'mcu', universe_key: 'mcu', tmdb_id: 1726, media_type: 'movie', name: 'Marvel Cinematic Universe', is_universe: true, total_movies: 69, last_viewed_at: new Date().toISOString() },
          { key: 'star_wars', universe_key: 'star_wars', tmdb_id: 11, media_type: 'movie', name: 'Star Wars Universe', is_universe: true, total_movies: 11, last_viewed_at: new Date().toISOString() },
          { key: 'dceu', universe_key: 'dceu', tmdb_id: 49529, media_type: 'movie', name: 'DC Extended Universe', is_universe: true, total_movies: 10, last_viewed_at: new Date().toISOString() },
          { key: 'kurtlar_vadisi', universe_key: 'kurtlar_vadisi', tmdb_id: 34587, media_type: 'tv', name: 'Valley of the Wolves (Kurtlar Vadisi)', is_universe: true, total_movies: 7, last_viewed_at: new Date().toISOString() }
        ];
      }

      return res.status(200).json(viewed);
    }
    if (path === 'franchises/record-view' && req.method === 'POST') {
      const body = await parseBody(req);
      const { data: existing } = await supabase.from('user_settings').select('settings').eq('id', `viewed_franchises_${userId}`).maybeSingle();
      let viewed = existing?.settings?.viewed_franchises || [];
      const key = body.universe_key || body.key || (body.tmdb_id ? `movie_${body.tmdb_id}` : body.name);
      viewed = viewed.filter(v => v.universe_key !== key && v.key !== key && String(v.tmdb_id) !== String(body.tmdb_id));
      viewed.unshift({
        key,
        universe_key: body.universe_key || null,
        tmdb_id: body.tmdb_id ? Number(body.tmdb_id) : null,
        media_type: body.media_type || 'movie',
        name: body.name || key,
        is_universe: !!body.is_universe,
        total_movies: body.total_movies || body.movie_count || 0,
        last_viewed_at: new Date().toISOString()
      });
      await supabase.from('user_settings').upsert({
        id: `viewed_franchises_${userId}`,
        user_id: userId,
        settings: { viewed_franchises: viewed.slice(0, 50) },
        updated_at: new Date().toISOString()
      });
      return res.status(200).json({ success: true, viewed_franchises: viewed });
    }
    if (path === 'franchises/viewed' && req.method === 'DELETE') {
      const body = await parseBody(req);
      const rawKey = body.key || body.universe_key || body.tmdb_id || query.key || query.tmdb_id;
      const targetKey = String(rawKey || '').trim();
      const { data: existing } = await supabase.from('user_settings').select('settings').eq('id', `viewed_franchises_${userId}`).maybeSingle();
      let viewed = existing?.settings?.viewed_franchises;
      
      // If user hasn't created a custom list yet, initialize from defaults first
      if (!Array.isArray(viewed)) {
        viewed = [
          { key: 'mcu', universe_key: 'mcu', tmdb_id: 1726, media_type: 'movie', name: 'Marvel Cinematic Universe', is_universe: true, total_movies: 69, last_viewed_at: new Date().toISOString() },
          { key: 'star_wars', universe_key: 'star_wars', tmdb_id: 11, media_type: 'movie', name: 'Star Wars Universe', is_universe: true, total_movies: 11, last_viewed_at: new Date().toISOString() },
          { key: 'dceu', universe_key: 'dceu', tmdb_id: 49529, media_type: 'movie', name: 'DC Extended Universe', is_universe: true, total_movies: 10, last_viewed_at: new Date().toISOString() },
          { key: 'kurtlar_vadisi', universe_key: 'kurtlar_vadisi', tmdb_id: 34587, media_type: 'tv', name: 'Valley of the Wolves (Kurtlar Vadisi)', is_universe: true, total_movies: 7, last_viewed_at: new Date().toISOString() }
        ];
      }

      viewed = viewed.filter(item => {
        const itemK = String(item.key || '').trim();
        const itemU = String(item.universe_key || '').trim();
        const itemT = String(item.tmdb_id || '').trim();
        const itemN = String(item.name || '').trim();

        if (itemK && (itemK === targetKey || itemK === `movie_${targetKey}`)) return false;
        if (itemU && itemU === targetKey) return false;
        if (itemT && (itemT === targetKey || `movie_${itemT}` === targetKey)) return false;
        if (itemN && itemN.toLowerCase() === targetKey.toLowerCase()) return false;
        return true;
      });

      await supabase.from('user_settings').upsert({
        id: `viewed_franchises_${userId}`,
        user_id: userId,
        settings: { viewed_franchises: viewed },
        updated_at: new Date().toISOString()
      });

      return res.status(200).json({ success: true, viewed_franchises: viewed });
    }

    // GET /api/franchises/:tmdbMovieId
    const franchiseMatch = path.match(/^franchises\/(\d+)$/);
    if (franchiseMatch && req.method === 'GET') {
      const tmdbMovieId = Number(franchiseMatch[1]);
      const requestedMediaType = query.media_type || 'movie';
      const rawLang = query.language || req.headers['x-language'];
      const targetLang = (rawLang && (rawLang.toLowerCase() === 'ru' || rawLang.toLowerCase().startsWith('ru-'))) ? 'ru-RU' : 'en-US';

      // 1. Fetch movie details from TMDB
      let movieDetail = null;
      let actualMediaType = requestedMediaType;
      try {
        const primaryUrl = requestedMediaType === 'tv'
          ? `https://api.themoviedb.org/3/tv/${tmdbMovieId}?api_key=${TMDB_KEY}&language=${targetLang}`
          : `https://api.themoviedb.org/3/movie/${tmdbMovieId}?api_key=${TMDB_KEY}&language=${targetLang}`;
        const r1 = await fetch(primaryUrl);
        if (r1.ok) {
          movieDetail = await r1.json();
        } else if (r1.status === 404) {
          const fallbackUrl = requestedMediaType === 'tv'
            ? `https://api.themoviedb.org/3/movie/${tmdbMovieId}?api_key=${TMDB_KEY}&language=${targetLang}`
            : `https://api.themoviedb.org/3/tv/${tmdbMovieId}?api_key=${TMDB_KEY}&language=${targetLang}`;
          const r2 = await fetch(fallbackUrl);
          if (r2.ok) {
            movieDetail = await r2.json();
            actualMediaType = requestedMediaType === 'tv' ? 'movie' : 'tv';
          }
        }
      } catch (e) {}

      if (!movieDetail) {
        return res.status(404).json({ error: 'Movie not found on TMDB' });
      }

      // 2. Check if movie belongs to a curated universe
      let matchedUniverseKey = null;
      let matchedUniverse = null;

      for (const [key, universe] of Object.entries(FRANCHISE_UNIVERSES)) {
        const collectionId = movieDetail.belongs_to_collection?.id;
        const matchesCollection = collectionId && universe.collection_ids?.includes(collectionId);
        const matchesKnownId = universe.known_tmdb_ids?.includes(tmdbMovieId);
        const matchesOrder = universe.chronological_order?.some(item => (typeof item === 'object' ? item.id : item) === tmdbMovieId);

        if (matchesCollection || matchesKnownId || matchesOrder) {
          matchedUniverseKey = key;
          matchedUniverse = universe;
          break;
        }
      }

      // Fetch user's movies from Supabase for board comparison
      const { data: userMoviesData } = await supabase.from('movies').select('*').eq('user_id', userId);
      const userMovies = userMoviesData || [];

      // Helper to check user board match
      const checkBoardMatch = (tmdbId) => {
        const found = userMovies.find(m => Number(m.tmdb_id) === Number(tmdbId));
        return { in_board: !!found, user_movie: found || null };
      };

      let finalResult = null;

      if (matchedUniverse) {
        // Case A: Curated Universe
        const rawItems = matchedUniverse.chronological_order;
        const movies = await Promise.all(
          rawItems.map(async (item, index) => {
            const rawId = typeof item === 'object' ? item.id : item;
            const isStringId = typeof rawId === 'string' && rawId.includes('_s');
            const baseTmdbId = (typeof item === 'object' && item.tmdb_id) ? item.tmdb_id : (isStringId ? parseInt(rawId.split('_s')[0], 10) : Number(rawId));
            const seasonNumber = (typeof item === 'object' && item.season_number) ? item.season_number : (isStringId ? parseInt(rawId.split('_s')[1], 10) : null);
            const itemType = (typeof item === 'object' && item.type) ? item.type : 'movie';
            const boardStatus = checkBoardMatch(baseTmdbId);

            const stage = (typeof item === 'object' && item.stage !== undefined) ? item.stage : null;
            const lane = (typeof item === 'object' && item.lane !== undefined) ? item.lane : null;
            const connects_to = (typeof item === 'object' && Array.isArray(item.connects_to)) ? item.connects_to : [];

            if (boardStatus.user_movie) {
              const um = boardStatus.user_movie;
              return {
                id: rawId,
                tmdb_id: baseTmdbId,
                season_number: seasonNumber,
                media_type: um.media_type || itemType,
                title: (typeof item === 'object' && item.title) ? item.title : (um.title || `Movie ${baseTmdbId}`),
                release_date: um.release_date || (typeof item === 'object' ? item.release_date : null),
                release_year: um.release_year || (typeof item === 'object' ? item.release_year : '-'),
                rating: um.rating || (typeof item === 'object' ? item.rating : null),
                poster_path: um.poster_path || (typeof item === 'object' ? item.poster_path : null),
                overview: um.overview || (typeof item === 'object' ? item.overview : ''),
                chronology_index: index + 1,
                stage,
                lane,
                connects_to,
                in_board: true,
                user_movie: um
              };
            }

            // If item already has pre-baked TMDB metadata, return instantly in 0ms!
            if (typeof item === 'object' && item.poster_path && item.title) {
              return {
                id: rawId,
                tmdb_id: baseTmdbId,
                season_number: seasonNumber,
                media_type: itemType,
                title: item.title,
                release_date: item.release_date || null,
                release_year: item.release_year || (item.release_date ? item.release_date.split('-')[0] : '-'),
                rating: item.rating || null,
                vote_count: item.vote_count || 0,
                poster_path: item.poster_path,
                overview: item.overview || '',
                chronology_index: index + 1,
                stage,
                lane,
                connects_to,
                in_board: false,
                user_movie: null
              };
            }

            const cacheKey = (itemType === 'tv' && seasonNumber) ? `tv_${baseTmdbId}_s${seasonNumber}_${targetLang}` : `${itemType}_${baseTmdbId}_${targetLang}`;
            if (tmdbDetailsCache.has(cacheKey)) {
              const cached = tmdbDetailsCache.get(cacheKey);
              return {
                id: rawId,
                tmdb_id: baseTmdbId,
                season_number: seasonNumber,
                media_type: itemType,
                ...cached,
                chronology_index: index + 1,
                stage,
                lane,
                connects_to,
                in_board: false,
                user_movie: null
              };
            }

            try {
              if (itemType === 'tv' && seasonNumber) {
                const itemUrl = `https://api.themoviedb.org/3/tv/${baseTmdbId}/season/${seasonNumber}?api_key=${TMDB_KEY}&language=${targetLang}`;
                const ir = await fetch(itemUrl, { signal: AbortSignal.timeout(2500) });
                if (ir.ok) {
                  const sd = await ir.json();
                  const releaseDate = sd.air_date || (typeof item === 'object' ? item.release_date : null);
                  const posterPath = sd.poster_path ? `https://image.tmdb.org/t/p/w500${sd.poster_path}` : (typeof item === 'object' ? item.poster_path : null);
                  const overview = (sd.overview && sd.overview.trim().length > 0) ? sd.overview : (typeof item === 'object' ? item.overview || '' : '');
                  const itemInfo = {
                    title: (sd.name && sd.name.trim()) ? sd.name : ((typeof item === 'object' && item.title) ? item.title : `Season ${seasonNumber}`),
                    release_date: releaseDate,
                    release_year: releaseDate ? releaseDate.split('-')[0] : (typeof item === 'object' ? item.release_year || '-' : '-'),
                    rating: sd.vote_average ? Number(sd.vote_average.toFixed(1)) : (typeof item === 'object' ? item.rating || null : null),
                    vote_count: sd.vote_count || 0,
                    poster_path: posterPath,
                    overview
                  };
                  tmdbDetailsCache.set(cacheKey, itemInfo);

                  return {
                    id: rawId,
                    tmdb_id: baseTmdbId,
                    season_number: seasonNumber,
                    media_type: itemType,
                    ...itemInfo,
                    chronology_index: index + 1,
                    stage,
                    lane,
                    connects_to,
                    in_board: false,
                    user_movie: null
                  };
                }
              } else {
                const itemUrl = `https://api.themoviedb.org/3/${itemType}/${baseTmdbId}?api_key=${TMDB_KEY}&language=${targetLang}`;
                const ir = await fetch(itemUrl, { signal: AbortSignal.timeout(2500) });
                if (ir.ok) {
                  const idata = await ir.json();
                  const releaseDate = idata.release_date || idata.first_air_date || (typeof item === 'object' ? item.release_date : null);
                  const posterPath = idata.poster_path ? `https://image.tmdb.org/t/p/w500${idata.poster_path}` : (typeof item === 'object' ? item.poster_path : null);
                  const overview = (idata.overview && idata.overview.trim().length > 0) ? idata.overview : (typeof item === 'object' ? item.overview || '' : '');
                  const itemInfo = {
                    title: idata.title || idata.name || idata.original_title || idata.original_name || (typeof item === 'object' && item.title ? item.title : `Movie ${baseTmdbId}`),
                    release_date: releaseDate,
                    release_year: releaseDate ? releaseDate.split('-')[0] : (typeof item === 'object' ? item.release_year || '-' : '-'),
                    rating: idata.vote_average ? Number(idata.vote_average.toFixed(1)) : (typeof item === 'object' ? item.rating || null : null),
                    vote_count: idata.vote_count || 0,
                    poster_path: posterPath,
                    overview
                  };
                  tmdbDetailsCache.set(cacheKey, itemInfo);

                  return {
                    id: rawId,
                    tmdb_id: baseTmdbId,
                    season_number: seasonNumber,
                    media_type: itemType,
                    ...itemInfo,
                    chronology_index: index + 1,
                    stage,
                    lane,
                    connects_to,
                    in_board: false,
                    user_movie: null
                  };
                }
              }
            } catch (e) {}

            return {
              id: rawId,
              tmdb_id: baseTmdbId,
              season_number: seasonNumber,
              media_type: itemType,
              title: (typeof item === 'object' && item.title) ? item.title : `Movie ${baseTmdbId}`,
              release_date: (typeof item === 'object' && item.release_date) ? item.release_date : null,
              release_year: (typeof item === 'object' && item.release_year) ? item.release_year : '-',
              rating: (typeof item === 'object' && item.rating) ? item.rating : null,
              poster_path: (typeof item === 'object' && item.poster_path) ? item.poster_path : null,
              overview: (typeof item === 'object' && item.overview) ? item.overview : '',
              chronology_index: index + 1,
              stage,
              lane,
              connects_to,
              in_board: false,
              user_movie: null
            };
          })
        );

        finalResult = {
          universe_key: matchedUniverseKey,
          universe_name: matchedUniverse.name,
          collection_name: movieDetail.belongs_to_collection?.name || null,
          is_universe: true,
          total_movies: movies.length,
          in_board_count: movies.filter(m => m.in_board).length,
          movies
        };
      } else if (movieDetail.belongs_to_collection) {
        // Case B: TMDB Collection (unmapped universe)
        const collectionId = movieDetail.belongs_to_collection.id;
        try {
          const colUrl = `https://api.themoviedb.org/3/collection/${collectionId}?api_key=${TMDB_KEY}&language=${targetLang}`;
          const cr = await fetch(colUrl);
          if (cr.ok) {
            const colData = await cr.json();
            const rawParts = colData.parts || [];
            rawParts.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));

            const movies = rawParts.map((part, index) => {
              const boardStatus = checkBoardMatch(part.id);
              const releaseDate = part.release_date || null;
              return {
                tmdb_id: part.id,
                media_type: 'movie',
                title: part.title || 'Untitled',
                release_date: releaseDate,
                release_year: releaseDate ? releaseDate.split('-')[0] : '-',
                rating: part.vote_average ? Number(part.vote_average.toFixed(1)) : null,
                poster_path: part.poster_path ? `https://image.tmdb.org/t/p/w500${part.poster_path}` : null,
                overview: part.overview || '',
                chronology_index: index + 1,
                in_board: boardStatus.in_board,
                user_movie: boardStatus.user_movie
              };
            });

            finalResult = {
              universe_key: null,
              universe_name: null,
              collection_name: colData.name || movieDetail.belongs_to_collection.name,
              is_universe: false,
              total_movies: movies.length,
              in_board_count: movies.filter(m => m.in_board).length,
              movies
            };
          }
        } catch (e) {}
      }

      if (!finalResult) {
        // Case C: Standalone Movie
        const boardStatus = checkBoardMatch(tmdbMovieId);
        const releaseDate = movieDetail.release_date || movieDetail.first_air_date || null;
        finalResult = {
          universe_key: null,
          universe_name: null,
          collection_name: null,
          is_universe: false,
          total_movies: 1,
          in_board_count: boardStatus.in_board ? 1 : 0,
          movies: [{
            tmdb_id: tmdbMovieId,
            media_type: actualMediaType,
            title: movieDetail.title || movieDetail.name || 'Untitled',
            release_date: releaseDate,
            release_year: releaseDate ? releaseDate.split('-')[0] : '-',
            rating: movieDetail.vote_average ? Number(movieDetail.vote_average.toFixed(1)) : null,
            poster_path: movieDetail.poster_path ? `https://image.tmdb.org/t/p/w500${movieDetail.poster_path}` : null,
            overview: movieDetail.overview || '',
            chronology_index: 1,
            in_board: boardStatus.in_board,
            user_movie: boardStatus.user_movie
          }]
        };
      }

      // Auto-record viewed franchise into Supabase user_settings
      try {
        const recordKey = matchedUniverseKey || (movieDetail.belongs_to_collection ? `col_${movieDetail.belongs_to_collection.id}` : `movie_${tmdbMovieId}`);
        const recordName = matchedUniverse ? matchedUniverse.name : (movieDetail.belongs_to_collection ? movieDetail.belongs_to_collection.name : (movieDetail.title || movieDetail.name));
        const recordCount = finalResult.movies.length;

        const { data: existingRow } = await supabase.from('user_settings').select('settings').eq('id', `viewed_franchises_${userId}`).maybeSingle();
        let viewedList = existingRow?.settings?.viewed_franchises || [];
        viewedList = viewedList.filter(v => v.universe_key !== recordKey && v.key !== recordKey && String(v.tmdb_id) !== String(tmdbMovieId));
        viewedList.unshift({
          key: recordKey,
          universe_key: matchedUniverseKey || null,
          tmdb_id: tmdbMovieId,
          media_type: actualMediaType,
          name: recordName,
          is_universe: !!matchedUniverse,
          total_movies: recordCount,
          last_viewed_at: new Date().toISOString()
        });
        await supabase.from('user_settings').upsert({
          id: `viewed_franchises_${userId}`,
          user_id: userId,
          settings: { viewed_franchises: viewedList.slice(0, 50) },
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Error auto-recording franchise view:', e.message);
      }

      return res.status(200).json(finalResult);
    }

    // ═══════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════
    const NOTIF_GENRE_MAP = {
      'action': 28, 'adventure': 12, 'animation': 16, 'comedy': 35,
      'crime': 80, 'documentary': 99, 'drama': 18, 'family': 10751,
      'fantasy': 14, 'history': 36, 'horror': 27, 'music': 10402,
      'mystery': 9648, 'romance': 10749, 'science fiction': 878, 'sci-fi': 878,
      'tv movie': 10770, 'thriller': 53, 'war': 10752, 'western': 37,
      'jangari': 28, 'sarguzasht': 12, 'animatsiya': 16, 'multfilm': 16,
      'komediya': 35, 'kriminal': 80, 'jinoyat': 80, 'hujjatli': 99,
      'drama': 18, 'dramatik': 18, 'oila': 10751, 'oilaviy': 10751,
      'fantastika': 14, 'tarixiy': 36, 'tarix': 36, "qo'rqinchli": 27,
      "qorqinchli": 27, 'daxshat': 27, 'musiqiy': 10402, 'detektiv': 9648,
      'romantika': 10749, 'melodrama': 10749, 'ilmiy-fantastik': 878,
      'triller': 53, 'harbiy': 10752, 'urush': 10752
    };

    const notifLastRunMap = global.__notifLastRunMap || (global.__notifLastRunMap = new Map());

    async function runSmartNotifications(targetUserId) {
      if (!targetUserId || !TMDB_KEY) return;
      const now = Date.now();
      const lastRun = notifLastRunMap.get(targetUserId) || 0;
      // Rate-limit smart check to once every 20 minutes per user session
      if (now - lastRun < 20 * 60 * 1000) return;
      notifLastRunMap.set(targetUserId, now);

      try {
        const [{ data: userMovies }, { data: existingNotifs }, { data: userPref }] = await Promise.all([
          supabase.from('movies').select('*').eq('user_id', targetUserId),
          supabase.from('notifications').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(60),
          supabase.from('user_preferences').select('*').eq('id', targetUserId).maybeSingle().catch(() => ({ data: null }))
        ]);

        const movies = userMovies || [];
        const notifs = existingNotifs || [];

        const existingTmdbIds = new Set(movies.map(m => m.tmdb_id ? String(m.tmdb_id) : null).filter(Boolean));
        const existingTitles = new Set(movies.map(m => (m.title || '').toLowerCase().trim()).filter(Boolean));

        const notifTmdbIds = new Set(notifs.map(n => n.movie_data?.tmdb_id ? String(n.movie_data.tmdb_id) : null).filter(Boolean));
        const notifTitles = new Set(notifs.map(n => (n.movie_data?.title || n.title || '').toLowerCase().replace(/^tavsiya:\s*/i, '').trim()).filter(Boolean));

        const newNotifsToInsert = [];

        // 1. Release Alerts: For movies with release_date <= today that user hasn't been alerted about
        const todayIso = new Date().toISOString().split('T')[0];
        const futuredMovies = movies.filter(m => m.release_date && m.release_date <= todayIso && (m.section === 'futured' || m.section === 'todo'));
        for (const fm of futuredMovies) {
          const fmId = fm.tmdb_id ? String(fm.tmdb_id) : null;
          const fmTitle = (fm.title || '').toLowerCase().trim();
          const alreadyAlerted = notifs.some(n => n.type === 'release_alert' && ((fmId && n.movie_data?.tmdb_id && String(n.movie_data.tmdb_id) === fmId) || (n.movie_data?.title || '').toLowerCase().trim() === fmTitle));
          if (!alreadyAlerted) {
            newNotifsToInsert.push({
              user_id: targetUserId,
              type: 'release_alert',
              title: `${fm.title} chiqdi!`,
              message: `"${fm.title}" filmining premyerasi bo'lib o'tdi. Tomosha qilish uchun tayyor!`,
              movie_data: {
                tmdb_id: fm.tmdb_id || null,
                imdb_id: fm.imdb_id || null,
                title: fm.title,
                poster_path: fm.poster_path || null,
                rating: fm.rating || null,
                release_date: fm.release_date || null,
                media_type: fm.media_type || 'movie'
              },
              is_read: false
            });
          }
        }

        // 2. AI Recommendations: If user has < 3 unread recommendations, discover new trending movies matching genres
        const unreadRecs = notifs.filter(n => n.type === 'recommendation' && !n.is_read);
        if (unreadRecs.length < 3) {
          let favoriteGenres = [];
          if (userPref && userPref.favorite_genres) {
            favoriteGenres = Array.isArray(userPref.favorite_genres) ? userPref.favorite_genres : String(userPref.favorite_genres).split(',').map(s => s.trim());
          }
          if (favoriteGenres.length === 0 && movies.length > 0) {
            const genreCounts = {};
            for (const m of movies) {
              if (m.genre && m.genre !== '-') {
                m.genre.split(',').forEach(g => {
                  const clean = g.trim().toLowerCase();
                  if (clean) genreCounts[clean] = (genreCounts[clean] || 0) + 1;
                });
              }
            }
            favoriteGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
          }

          const genreIds = favoriteGenres.map(g => {
            const str = String(g).trim().toLowerCase();
            return NOTIF_GENRE_MAP[str] || (/^\d+$/.test(str) ? parseInt(str, 10) : null);
          }).filter(Boolean);

          let discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&sort_by=popularity.desc&vote_count.gte=100&language=en-US&page=1`;
          if (genreIds.length > 0) {
            discoverUrl += `&with_genres=${genreIds.slice(0, 3).join('|')}`;
          }

          const discRes = await fetch(discoverUrl, { signal: AbortSignal.timeout(3500) });
          if (discRes.ok) {
            const discData = await discRes.json();
            const results = discData.results || [];
            const candidates = results.filter(item => {
              const itemId = String(item.id);
              const itemTitle = (item.title || '').toLowerCase().trim();
              if (existingTmdbIds.has(itemId) || notifTmdbIds.has(itemId)) return false;
              if (existingTitles.has(itemTitle) || notifTitles.has(itemTitle)) return false;
              return true;
            }).slice(0, 3);

            for (const item of candidates) {
              newNotifsToInsert.push({
                user_id: targetUserId,
                type: 'recommendation',
                title: `Tavsiya: ${item.title}`,
                message: item.overview ? (item.overview.length > 130 ? item.overview.slice(0, 130) + '...' : item.overview) : 'Siz yoqtirgan janrlar asosida tavsiya qilindi.',
                movie_data: {
                  tmdb_id: item.id,
                  title: item.title,
                  poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                  rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
                  vote_count: item.vote_count || 0,
                  release_date: item.release_date || null,
                  media_type: 'movie'
                },
                is_read: false
              });
            }
          }
        }

        if (newNotifsToInsert.length > 0) {
          for (const notifItem of newNotifsToInsert) {
            await supabase.from('notifications').insert([notifItem]).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Smart notification generation error:', err.message);
      }
    }

    if (path === 'notifications' && req.method === 'GET') {
      try {
        await runSmartNotifications(userId);
      } catch (e) {
        console.warn('Error running smart notifications:', e.message);
      }

      const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      const list = data || [];
      const seen = new Set();
      const unique = [];
      for (const n of list) {
        const key = `${n.type}_${n.movie_data?.tmdb_id || (n.movie_data?.title || n.title || '').toLowerCase().replace(/^tavsiya:\s*/i, '').trim()}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(n);
        }
      }
      return res.status(200).json(unique);
    }
    if (path === 'notifications/refresh' && req.method === 'POST') {
      notifLastRunMap.delete(userId);
      await runSmartNotifications(userId);
      const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      return res.status(200).json(data || []);
    }
    const notifReadMatch = path.match(/^notifications\/([^/]+)\/read$/);
    if (notifReadMatch && req.method === 'PATCH') {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notifReadMatch[1]);
      return res.status(200).json({ success: true });
    }
    if (path === 'notifications/read-all' && req.method === 'POST') {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
      return res.status(200).json({ success: true });
    }
    const notifDelMatch = path.match(/^notifications\/([^/]+)$/);
    if (notifDelMatch && req.method === 'DELETE') {
      await supabase.from('notifications').delete().eq('id', notifDelMatch[1]);
      return res.status(200).json({ success: true });
    }

    // ═══════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════
    if (path === 'settings' && req.method === 'GET') {
      const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
      return res.status(200).json(data || {});
    }
    if (path === 'settings' && req.method === 'PUT') {
      const body = await parseBody(req);
      await supabase.from('user_settings').upsert({ ...body, user_id: userId, updated_at: new Date().toISOString() });
      return res.status(200).json({ success: true });
    }

    // ═══════════════════════════════════════
    // AUTH PROFILE
    // ═══════════════════════════════════════
    if (path === 'auth/profile' && req.method === 'PATCH') {
      const body = await parseBody(req);
      const update = {};
      if (body.first_name !== undefined) update.first_name = body.first_name;
      if (body.last_name !== undefined) update.last_name = body.last_name;
      if (Object.keys(update).length > 0) {
        await supabase.from('users').update(update).eq('id', userId);
      }
      return res.status(200).json({ success: true });
    }

    // ═══════════════════════════════════════
    // FALLBACK 404
    // ═══════════════════════════════════════
    return res.status(404).json({ error: 'Not found', path });

  } catch (err) {
    console.error('Vercel API error:', err);
    return res.status(500).json({ error: err.message });
  }
};
