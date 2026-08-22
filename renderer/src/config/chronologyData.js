import { CHRONOLOGY_LOOKUP } from './chronologyLookupRaw.js';

export { CHRONOLOGY_LOOKUP };

const FRANCHISE_PATTERNS = [
  { key: 'john_wick', regex: /^John Wick/i },
  { key: 'harry_potter', regex: /^(Harry Potter|Fantastic Beasts)/i },
  { key: 'mission_impossible', regex: /^Mission:?\s*Impossible/i },
  { key: 'fast_furious', regex: /^(Fast & Furious|2 Fast 2|The Fast and the|Fast Five|Furious 7|The Fate of the Furious|F9|Fast X)/i },
  { key: 'matrix', regex: /^The Matrix/i },
  { key: 'lord_of_the_rings', regex: /^(The Lord of the Rings|The Hobbit|Lord of the Rings)/i },
  { key: 'transformers', regex: /^(Transformers|Bumblebee)/i },
  { key: 'pirates_caribbean', regex: /^Pirates of the Caribbean/i },
  { key: 'avatar', regex: /^Avatar/i },
  { key: 'dune', regex: /^Dune/i },
  { key: 'hunger_games', regex: /^The Hunger Games/i },
  { key: 'twilight', regex: /^(The Twilight Saga|Twilight)/i },
  { key: 'shrek', regex: /^(Shrek|Puss in Boots)/i },
  { key: 'despicable_me', regex: /^(Despicable Me|Minions)/i },
  { key: 'toy_story', regex: /^(Toy Story|Lightyear)/i },
  { key: 'kung_fu_panda', regex: /^Kung Fu Panda/i },
  { key: 'jurassic', regex: /^Jurassic (Park|World)/i },
  { key: 'spider_man', regex: /^(Spider-Man|The Amazing Spider-Man)/i },
  { key: 'batman', regex: /^(Batman|The Dark Knight|The Batman)/i },
  { key: 'x_men', regex: /^(X-Men|Wolverine|Deadpool|The New Mutants)/i },
  { key: 'alien_predator', regex: /^(Alien|Predator|Prey|Prometheus|Alien:)/i },
  { key: 'planet_apes', regex: /^(Planet of the Apes|Rise of the Planet|Dawn of the Planet|War for the Planet|Kingdom of the Planet)/i },
  { key: 'monsterverse', regex: /^(Godzilla|Kong: Skull Island|Godzilla vs|Godzilla x)/i },
  { key: 'saw', regex: /^(Saw|Jigsaw|Spiral)/i },
  { key: 'conjuring', regex: /^(The Conjuring|Annabelle|The Nun|The Curse of La Llorona)/i },
  { key: 'insidious', regex: /^Insidious/i },
  { key: 'final_destination', regex: /^Final Destination/i },
  { key: 'bad_boys', regex: /^Bad Boys/i },
  { key: 'mad_max', regex: /^(Mad Max|Furiosa)/i },
  { key: 'terminator', regex: /^(Terminator|The Terminator)/i },
  { key: 'blade_runner', regex: /^Blade Runner/i },
  { key: 'ghostbusters', regex: /^Ghostbusters/i },
  { key: 'guardians_galaxy', regex: /^Guardians of the Galaxy/i },
  { key: 'knives_out', regex: /^(Knives Out|Glass Onion|Wake Up Dead Man)/i },
  { key: 'paddington', regex: /^Paddington/i },
  { key: 'sonic', regex: /^Sonic the Hedgehog/i },
  { key: 'inside_out', regex: /^Inside Out/i },
  { key: 'cars', regex: /^(Cars|Planes)/i },
  { key: 'frozen', regex: /^Frozen/i },
  { key: 'finding_nemo', regex: /^(Finding Nemo|Finding Dory)/i },
  { key: 'incredibles', regex: /^The Incredibles/i },
  { key: 'monsters_inc', regex: /^(Monsters, Inc|Monsters University)/i },
  { key: 'creed_rocky', regex: /^(Creed|Rocky)/i },
  { key: 'top_gun', regex: /^Top Gun/i },
  { key: 'gladiator', regex: /^Gladiator/i },
  { key: 'joker', regex: /^Joker/i },
  { key: 'venom', regex: /^Venom/i },
  { key: 'quiet_place', regex: /^A Quiet Place/i },
  { key: 'it_clown', regex: /^It\\b/i },
  { key: 'scream', regex: /^Scream/i },
  { key: 'halloween', regex: /^Halloween/i },
  { key: 'night_museum', regex: /^Night at the Museum/i },
  { key: 'men_in_black', regex: /^(Men in Black|MIB)/i },
  { key: 'rush_hour', regex: /^Rush Hour/i },
  { key: 'oceans', regex: /^Ocean's/i },
  { key: 'now_you_see_me', regex: /^Now You See Me/i },
  { key: 'kingsman', regex: /^(Kingsman|The King's Man)/i },
  { key: 'equalizer', regex: /^The Equalizer/i },
  { key: 'expendables', regex: /^The Expendables/i },
  { key: 'taken', regex: /^Taken/i },
  { key: 'national_treasure', regex: /^National Treasure/i },
  { key: 'maze_runner', regex: /^The Maze Runner|^Maze Runner/i },
  { key: 'divergent', regex: /^(Divergent|Insurgent|Allegiant)/i },
  { key: 'narnia', regex: /^(The Chronicles of Narnia|Narnia)/i },
  { key: 'jumanji', regex: /^Jumanji/i },
  { key: 'mummy', regex: /^The Mummy/i }
];

export function getMovieFranchiseInfo(movie) {
  if (!movie) return null;
  const tmdbId = String(movie.tmdb_id || movie.id);
  if (CHRONOLOGY_LOOKUP[tmdbId]) {
    return {
      universe_key: CHRONOLOGY_LOOKUP[tmdbId].universe_key,
      chronology_index: CHRONOLOGY_LOOKUP[tmdbId].chronology_index,
      is_custom_universe: true
    };
  }

  const rawTitle = (movie.title || '').trim();
  for (const p of FRANCHISE_PATTERNS) {
    if (p.regex.test(rawTitle)) {
      const year = parseInt(movie.release_year || (movie.release_date || '').split('-')[0] || '0') || 0;
      return {
        universe_key: p.key,
        chronology_index: year,
        is_custom_universe: false
      };
    }
  }

  return null;
}
