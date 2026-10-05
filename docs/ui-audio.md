# Support UI audio verification

The shared document-delegated `src/scripts/uiSounds.ts` now recognizes native
radio/checkbox controls and their labels, alongside the existing links, buttons,
and custom buttons. Label contents and the associated input resolve to one hover
target. Only the forwarded native input click plays release feedback, avoiding
two restarts for one label activation. Successful click eligibility is checked
in capture before a control's local handler disables it (as Create Payment does).
Already-disabled controls remain silent on hover/release and retain deny feedback.

Crypto's steps hide/show existing elements; they neither recreate the shared audio
players nor stop playback. Browser tracing found rollover restarts on entry into
another control, matching the existing shared policy. That intentional replacement
remains, as do independent rollover/release/deny players, existing volumes, touch
hover exclusion, opt-outs, Scout exclusion, and preload handling. No timers or
Crypto-specific audio were added.

Repeated activation also exposed same-control self-interruption: each click
unconditionally paused and rewound the release player, even if the previous
request was still starting or playing. The shared release handler now remembers
its control and coalesces another activation of that same control while its cue
is active. Completed cues replay normally; a different control still supersedes
an active release. Rollover retains its original rapid restart behavior.

Spaced repeated clicks did not reproduce truncation in local Edge: audio-thread
PCM capture showed approximately identical energy (0.95955 at the test's 48 kHz
rate) and a complete ~148 ms waveform on every activation. Rapid same-control
activation did reproduce the premature pause/rewind. The regression test covers
both cases and confirms that repeated active requests no longer restart the cue.

## Success asset loudness

Measured every existing `public/audio/ui/*.ogg` using FFmpeg 9.0.2: decoded
floating-point PCM RMS/sample peak and the EBU R128 filter with 48 kHz analysis
resampling and true-peak measurement. Effects shorter than a 400 ms integration
window cannot produce useful single-play integrated loudness, and none spans a
full 3-second short-term window. To compare their
spectral loudness consistently, each asset was also repeated continuously for
6 seconds. These repeated measurements are comparative, not the loudness of a
single isolated click. The short-term values below are maxima during that repeat.

| Original asset | RMS dBFS | Sample peak dBFS | Repeated integrated LUFS | Repeated short-term LUFS |
| --- | ---: | ---: | ---: | ---: |
| buttonrollover.ogg | -25.37 | -11.04 | -23.5 | -23.5 |
| buttonclickrelease.ogg | -26.65 | -14.72 | -22.1 | -22.0 |
| wpn_denyselect.ogg | -20.33 | -8.28 | -17.7 | -17.7 |
| message.ogg | -19.13 | -3.41 | -16.5 | -16.3 |
| misc_success.ogg | -21.71 | -5.80 | -18.3 | -18.1 |
| hard_error.ogg | -21.28 | -3.42 | -16.5 | -16.5 |
| bugreporter_failed.ogg | -21.64 | -3.14 | -17.1 | -17.4 |

The reference includes actual playback levels: rollover uses volume 0.2, release
and deny use 0.25, and Contact's message success uses 0.3. Their repeated loudness
at those gains is approximately -37.5, -34.1, -29.7, and -27.0 LUFS. Fiat's
`misc_success.ogg` uses the default volume 1, explaining its louder perceived
level despite a file RMS similar to other effects. Targeting the median of the
normal feedback set (-31.9 LUFS) gives **-13.6 dB** gain. Distinct failure alerts
were measured but excluded from this normal-feedback target.

| misc_success.ogg measurement | Before | After |
| --- | ---: | ---: |
| Single-play integrated LUFS | -16.8 | -30.4 |
| Repeated integrated LUFS | -18.3 | -31.9 |
| Repeated maximum short-term LUFS | -18.1 | -31.7 |
| RMS dBFS | -21.71 | -35.33 |
| Sample peak dBFS | -5.80 | -19.27 |
| True peak dBFS | -5.7 | -19.2 |
| Crest factor dB | 15.91 | 16.06 |

Only constant gain and high-quality Vorbis re-encoding were applied; no
compression, limiting, or runtime volume exception. Original Ogg format, path,
11025 Hz stereo, and 0.612517-second container duration are preserved. Decoder
padding/timestamps were bounded/reset to retain the original duration; decoded
waveforms have zero alignment offset, 0.99945 correlation, and measured gain
-13.62 dB. Other sound assets are unchanged.

## Validation

`node --test tests/cryptoBackend.test.mjs tests/cryptoFrontend.test.mjs tests/uiSounds.test.mjs`
covers backend/frontend behavior plus shared audio event eligibility, capture
timing, label forwarding, hover deduplication, disabled/native-fieldset behavior,
touch/opt-out/Scout exclusions, preload, and intentional same-channel replacement.

`tests/uiSounds.browser.mjs` is an optional real-media regression test using
Playwright and a locally running Astro server. Install Playwright separately or
set `PLAYWRIGHT_MODULE_PATH` to an existing module; `BROWSER_EXECUTABLE` selects
an installed Chromium/Edge executable, and `UI_AUDIO_TEST_URL` defaults to
`http://localhost:4321/support`. It captures decoded release samples on the audio
rendering thread with an AudioWorklet, comparing five sequential activations of
the same Crypto preset, currency label, and existing Fiat preset for waveform
duration, energy, and completion. Rapid repeated activation must produce one
uninterrupted cue. Payment responses are mocked; no provider POST is sent.

Local Edge testing used real media playback with only the payment HTTP response
mocked. Identity → Amount → Currency → Payment, named/anonymous choices, both
internal back steps, rapid movement across currency controls, label-to-input
movement, and clicking after rollover passed. Each activation produced one
release; Create Payment's release reached `ended` across the step change. Shared
player identities persisted, and every explicit pause was paired with a restart
of that same player. This is playback/event verification, not a claim of listening
through the user's headphones or testing the live provider.
