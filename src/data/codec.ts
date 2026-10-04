/*
 * CODEC DATA
 *
 * Dialogue used by the Interests Codec display.
 *
 * This conversation is inspired by the corrupted
 * Arsenal Gear Codec sequence from Metal Gear Solid 2.
 *
 * The original dialogue has been paraphrased rather
 * than reproduced directly.
 */

export interface CodecLine {
  speaker:
    | 'COLONEL'
    | 'ROSE'
    | 'RAIDEN';

  text: string;
}


/*
 * CODEC CONVERSATION
 *
 * Lines are deliberately ordered so the display
 * gradually deteriorates from a believable Codec
 * conversation into GW completely losing it.
 */

export const codecLines: CodecLine[] = [
  /*
   * SOMETHING IS WRONG
   */

  {
    speaker: 'COLONEL',
    text:
      'Raiden, continue with the mission according to the simulation.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Simulation? Colonel, what are you talking about?',
  },

  {
    speaker: 'COLONEL',
    text:
      'There is no need for further questions. Proceed with the mission.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'You’ve been acting strange ever since I entered Arsenal.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Your observations are irrelevant. Continue.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'That did not make you sound less suspicious.',
  },


  /*
   * SIGNAL FAILURE
   */

  {
    speaker: 'RAIDEN',
    text:
      'Colonel? Your image is breaking up.',
  },

  {
    speaker: 'COLONEL',
    text:
      'There is nothing wrong with the transmission.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Your face just disappeared for half a second.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Ignore it.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Very reassuring.',
  },


  /*
   * THE CONSOLE
   */

  {
    speaker: 'COLONEL',
    text:
      'Raiden. Turn the game console off.',
  },

  {
    speaker: 'RAIDEN',
    text:
      '...What?',
  },

  {
    speaker: 'COLONEL',
    text:
      'The operation has failed. Shut the system down immediately.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Colonel, what game console?',
  },

  {
    speaker: 'ROSE',
    text:
      'You really shouldn’t sit so close to the screen.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Rose?! What are either of you talking about?',
  },

  {
    speaker: 'COLONEL',
    text:
      'It is only a game. There is nothing to worry about.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'That sentence somehow made this significantly worse.',
  },


  /*
   * UFO INCIDENT
   */

  {
    speaker: 'COLONEL',
    text:
      'Something unusual happened to me while I was driving home recently.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'This is really not the time.',
  },

  {
    speaker: 'COLONEL',
    text:
      'There was an orange light in the sky. It moved in ways an aircraft should not.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Then everything became bright.',
  },

  {
    speaker: 'COLONEL',
    text:
      'The next thing I remember, I was already home.',
  },

  {
    speaker: 'COLONEL',
    text:
      'What do you think happened?',
  },

  {
    speaker: 'RAIDEN',
    text:
      'I think your codec is having a stroke.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Never mind.',
  },


  /*
   * FINANCIAL ADVICE???
   */

  {
    speaker: 'COLONEL',
    text:
      'Raiden, I owe you an apology.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'For what?',
  },

  {
    speaker: 'COLONEL',
    text:
      'My finances have been difficult lately.',
  },

  {
    speaker: 'COLONEL',
    text:
      'There are bills, obligations, and other expenses I would rather not discuss.',
  },

  {
    speaker: 'COLONEL',
    text:
      'That is why I made you cover lunch.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'We have never had lunch together.',
  },

  {
    speaker: 'COLONEL',
    text:
      'I am sorry.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Colonel?',
  },

  {
    speaker: 'COLONEL',
    text:
      'Continue the mission.',
  },


  /*
   * GARDENING
   */

  {
    speaker: 'COLONEL',
    text:
      'Be careful when handling certain flowering plants.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Oh no.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Their sap may irritate exposed skin.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Protective gloves are recommended when pruning them.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'I am currently naked inside a gigantic military fortress.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Correct.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'There are no plants here.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Correct.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Why are you giving me gardening advice?',
  },

  {
    speaker: 'COLONEL',
    text:
      'Proceed with caution.',
  },


  /*
   * OLD MISSION DATA BLEEDING THROUGH
   */

  {
    speaker: 'COLONEL',
    text:
      'Your objective is to infiltrate the enemy fortress.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'I’m already inside Arsenal Gear.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Locate the hostages and prevent Metal Gear from becoming operational.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'That isn’t my mission.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Avoid detection. The success of the operation depends on you.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'You’re reading somebody else’s mission data.',
  },

  {
    speaker: 'COLONEL',
    text:
      'The mission parameters are correct.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'No. They very much are not.',
  },


  /*
   * ROSE
   */

  {
    speaker: 'ROSE',
    text:
      'Raiden?',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Rose? Are you actually there?',
  },

  {
    speaker: 'ROSE',
    text:
      'Of course I’m here.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'I’m starting to have some serious doubts about that.',
  },

  {
    speaker: 'ROSE',
    text:
      'Why would you say something like that?',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Because the Colonel just gave me gardening advice and told me to turn off a game console.',
  },

  {
    speaker: 'ROSE',
    text:
      'Maybe you should listen to him.',
  },

  {
    speaker: 'RAIDEN',
    text:
      '...Right.',
  },


  /*
   * GW IS REALLY STARTING TO FALL APART
   */

  {
    speaker: 'COLONEL',
    text:
      'Raiden.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'What now?',
  },

  {
    speaker: 'COLONEL',
    text:
      'Have you ever considered that your memories may simply be information?',
  },

  {
    speaker: 'RAIDEN',
    text:
      'I would really prefer tactical advice right now.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Information is preserved. Information is altered. Information is discarded.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Colonel.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Context determines value.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Colonel!',
  },

  {
    speaker: 'COLONEL',
    text:
      'Complete your mission according to the simulation.',
  },


  /*
   * PLAYER ACKNOWLEDGEMENT
   */

  {
    speaker: 'COLONEL',
    text:
      'You have been playing for quite some time.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Playing what?',
  },

  {
    speaker: 'COLONEL',
    text:
      'Surely you have something more productive to do.',
  },

  {
    speaker: 'RAIDEN',
    text:
      "You’re talking to somebody else, aren’t you?",
  },

  {
    speaker: 'COLONEL',
    text:
      'Continuing indefinitely serves no purpose.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Who are you talking to?',
  },

  {
    speaker: 'COLONEL',
    text:
      'Turn it off.',
  },


  /*
   * COMPLETE NONSENSE
   */

  {
    speaker: 'COLONEL',
    text:
      'The purple worm has entered flap-jaw space.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'The what?',
  },

  {
    speaker: 'COLONEL',
    text:
      'The tuning fork is already prepared.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Those are individual words, yes.',
  },

  {
    speaker: 'COLONEL',
    text:
      'Raw blink. Hara-kiri Rock.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'I have absolutely no idea what you want me to do with that information.',
  },

  {
    speaker: 'COLONEL',
    text:
      'I need scissors! 61!',
  },

  {
    speaker: 'RAIDEN',
    text:
      'There it is.',
  },


  /*
   * COMMAND LOOP
   */

  {
    speaker: 'COLONEL',
    text:
      'Finish the mission.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Who are you?',
  },

  {
    speaker: 'COLONEL',
    text:
      'Finish the mission.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Where is the real Colonel?',
  },

  {
    speaker: 'COLONEL',
    text:
      'Finish the mission.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Are you even listening to me?',
  },

  {
    speaker: 'COLONEL',
    text:
      'Complete your mission according to the simulation.',
  },


  /*
   * SYSTEM COLLAPSE
   */

  {
    speaker: 'COLONEL',
    text:
      'RAIDEN.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'I’m here.',
  },

  {
    speaker: 'COLONEL',
    text:
      'RAIDEN.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Colonel?',
  },

  {
    speaker: 'COLONEL',
    text:
      'MISSION DATA CORRECT.',
  },

  {
    speaker: 'COLONEL',
    text:
      'SIMULATION CORRECT.',
  },

  {
    speaker: 'COLONEL',
    text:
      'CONTEXT CORRECT.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'Yeah, I’m done listening to you.',
  },

  {
    speaker: 'COLONEL',
    text:
      'TURN THE GAME CONSOLE OFF.',
  },

  {
    speaker: 'RAIDEN',
    text:
      'No.',
  },

  {
    speaker: 'COLONEL',
    text:
      'I NEED SCISSORS! 61!',
  },
];