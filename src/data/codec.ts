/*
 * CODEC DATA
 *
 * Dialogue used by the Interests Codec display.
 *
 * Snake's short lines are drawn from his MGS2
 * Tanker-era Codec conversations.
 *
 * Phoxy's dialogue is original writing inspired
 * by the conversational role Otacon fills without
 * reproducing Otacon's script.
 */

export interface CodecLine {
  speaker:
    | 'SNAKE'
    | 'PHOXY';

  text: string;
}


/*
 * CODEC CONVERSATION
 *
 * Lines are deliberately ordered rather than
 * randomized so the display feels like an actual
 * back-and-forth Codec call.
 */

export const codecLines: CodecLine[] = [
  /*
   * OPENING
   */

  {
    speaker: 'SNAKE',
    text:
      'This is Snake. Do you read me, Otacon?',
  },

  {
    speaker: 'PHOXY',
    text:
      'Loud and clear. And it’s Phoxy, remember?',
  },

  {
    speaker: 'SNAKE',
    text:
      'What is this, all of a sudden?',
  },

  {
    speaker: 'PHOXY',
    text:
      'Consider it a software update. Same frequency, different operator.',
  },

  {
    speaker: 'SNAKE',
    text:
      'Great...',
  },

  {
    speaker: 'PHOXY',
    text:
      'You say that like you aren’t happy to hear me.',
  },


  /*
   * EQUIPMENT
   */

  {
    speaker: 'SNAKE',
    text:
      "Right. I didn't plan on relying on this gadget anyway.",
  },

  {
    speaker: 'PHOXY',
    text:
      'You always say that until the gadget is the thing keeping you alive.',
  },

  {
    speaker: 'SNAKE',
    text:
      'Almost reminds me of Mei Ling...',
  },

  {
    speaker: 'PHOXY',
    text:
      'I’m going to pretend that was a compliment.',
  },

  {
    speaker: 'SNAKE',
    text:
      "Any more info on the Navy's model?",
  },

  {
    speaker: 'PHOXY',
    text:
      'Still digging. What I have is incomplete, so don’t make assumptions yet.',
  },


  /*
   * MISSION
   */

  {
    speaker: 'SNAKE',
    text:
      'Who are they?',
  },

  {
    speaker: 'PHOXY',
    text:
      'Not Navy. Whoever they are, they came prepared and they know the ship.',
  },

  {
    speaker: 'SNAKE',
    text:
      'So this is the new Metal Gear...',
  },

  {
    speaker: 'PHOXY',
    text:
      'Looks like it. Try getting closer before we decide exactly what we’re looking at.',
  },


  /*
   * PHOXY CHECK-IN
   */

  {
    speaker: 'PHOXY',
    text:
      'Snake, hold up. I’m seeing movement ahead of you.',
  },

  {
    speaker: 'SNAKE',
    text:
      'How many?',
  },

  {
    speaker: 'PHOXY',
    text:
      'Can’t tell from here. Keep low and don’t give them a reason to start shooting.',
  },

  {
    speaker: 'SNAKE',
    text:
      'Understood.',
  },

  {
    speaker: 'PHOXY',
    text:
      'And before you say it: yes, I know you can handle yourself.',
  },

  {
    speaker: 'SNAKE',
    text:
      'Then why mention it?',
  },

  {
    speaker: 'PHOXY',
    text:
      'Because apparently someone has to be the responsible one on this frequency.',
  },


  /*
   * TECHNICAL CHATTER
   */

  {
    speaker: 'PHOXY',
    text:
      'Your signal just dropped for a second. You still with me?',
  },

  {
    speaker: 'SNAKE',
    text:
      'I can hear you.',
  },

  {
    speaker: 'PHOXY',
    text:
      'Good. This weather is making the connection unstable.',
  },

  {
    speaker: 'SNAKE',
    text:
      'Can you compensate?',
  },

  {
    speaker: 'PHOXY',
    text:
      'Already doing it. Just don’t disappear into the bottom of the Atlantic.',
  },

  {
    speaker: 'SNAKE',
    text:
      'I’ll try.',
  },

  {
    speaker: 'PHOXY',
    text:
      'That was not reassuring.',
  },


  /*
   * PHOTOGRAPHY
   */

  {
    speaker: 'PHOXY',
    text:
      'Remember, we need evidence. Get clear pictures before you leave.',
  },

  {
    speaker: 'SNAKE',
    text:
      'I know.',
  },

  {
    speaker: 'PHOXY',
    text:
      'Front, side, identifying markings—anything that proves what they built.',
  },

  {
    speaker: 'SNAKE',
    text:
      'You want a photo shoot.',
  },

  {
    speaker: 'PHOXY',
    text:
      'A heavily armed, classified photo shoot. Yes.',
  },


  /*
   * GENERAL BANTER
   */

  {
    speaker: 'PHOXY',
    text:
      'You know, most people would call this an extremely bad idea.',
  },

  {
    speaker: 'SNAKE',
    text:
      'Most people aren’t here.',
  },

  {
    speaker: 'PHOXY',
    text:
      'Exactly. They’re somewhere warm and dry making better life choices.',
  },

  {
    speaker: 'SNAKE',
    text:
      'You volunteered.',
  },

  {
    speaker: 'PHOXY',
    text:
      'Remote support. Very important distinction.',
  },


  /*
   * STEALTH
   */

  {
    speaker: 'PHOXY',
    text:
      'There’s another patrol coming around. You’ve got a small window.',
  },

  {
    speaker: 'SNAKE',
    text:
      'I see them.',
  },

  {
    speaker: 'PHOXY',
    text:
      'Then wait for them to pass. There’s no reason to turn this into a firefight.',
  },

  {
    speaker: 'SNAKE',
    text:
      'Wasn’t planning to.',
  },

  {
    speaker: 'PHOXY',
    text:
      'Good. I enjoy plans that involve fewer bullets.',
  },


  /*
   * ANOTHER CHECK-IN
   */

  {
    speaker: 'PHOXY',
    text:
      'Snake?',
  },

  {
    speaker: 'SNAKE',
    text:
      'What?',
  },

  {
    speaker: 'PHOXY',
    text:
      'Nothing. Your signal went quiet again.',
  },

  {
    speaker: 'SNAKE',
    text:
      'I’m still here.',
  },

  {
    speaker: 'PHOXY',
    text:
      'Good. Continue.',
  },


  /*
   * INFORMATION
   */

  {
    speaker: 'PHOXY',
    text:
      'I found something. The deployment schedule doesn’t match the official record.',
  },

  {
    speaker: 'SNAKE',
    text:
      'Meaning?',
  },

  {
    speaker: 'PHOXY',
    text:
      'Meaning somebody wanted this thing moved without attracting attention.',
  },

  {
    speaker: 'SNAKE',
    text:
      'Figures.',
  },

  {
    speaker: 'PHOXY',
    text:
      'Yeah. Classified superweapons are rarely accompanied by good news.',
  },


  /*
   * PHOXY BEING PHOXY
   */

  {
    speaker: 'PHOXY',
    text:
      'By the way, your Codec interface is ancient.',
  },

  {
    speaker: 'SNAKE',
    text:
      'It works.',
  },

  {
    speaker: 'PHOXY',
    text:
      'That is exactly what people say five minutes before something stops working.',
  },

  {
    speaker: 'SNAKE',
    text:
      'You done?',
  },

  {
    speaker: 'PHOXY',
    text:
      'For now.',
  },


  /*
   * APPROACHING OBJECTIVE
   */

  {
    speaker: 'PHOXY',
    text:
      'You should be getting close. I’m picking up a large open compartment ahead.',
  },

  {
    speaker: 'SNAKE',
    text:
      'The hold?',
  },

  {
    speaker: 'PHOXY',
    text:
      'Should be. If the intelligence was right, that’s where they’re keeping it.',
  },

  {
    speaker: 'SNAKE',
    text:
      'I’m moving in.',
  },

  {
    speaker: 'PHOXY',
    text:
      'Carefully.',
  },

  {
    speaker: 'SNAKE',
    text:
      'I know.',
  },

  {
    speaker: 'PHOXY',
    text:
      'I know you know. I’m still saying it.',
  },


  /*
   * LOOP BACK
   */

  {
    speaker: 'SNAKE',
    text:
      'Anything else?',
  },

  {
    speaker: 'PHOXY',
    text:
      'Nothing useful yet. Keep moving and call if the situation changes.',
  },

  {
    speaker: 'SNAKE',
    text:
      'Got it.',
  },

  {
    speaker: 'PHOXY',
    text:
      'Phoxy out.',
  },
];