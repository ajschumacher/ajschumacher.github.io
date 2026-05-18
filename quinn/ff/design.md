# Fairy Fun game design


## Synopsis

Fairy Fun is a web game designed by Quinn, age seven. It is not a
fighting game, but a whimsical gleeful game of exploration and fun.


## Platforms

Fairy Fun is playable on laptop and desktop computers and also iPads
and phones of all types.


## Design aesthetic

Bright rainbow mostly.


## Gameplay


### Background music

The game has background music that plays on a loop the whole time the
game is open. The music is in `Footsteps_On_The_Square.mp3`. The music
should start the moment you enter the game and keep playing forever
without interruption, but should stop the moment you exit the game.


### Initial screen

When a player first goes to the game, they see the Fairy Fun logo at
the top of the screen, centered. This is `images/fairyfun.png`. Below
that is the "start" button, `images/start.png`. Below that is the text
"Idea by Quinn. Made by Quinn and Aaron."

When the player clicks on the "start" button, it brings them to the
welcome screen.


### Welcome screen

The welcome screen has this informative text about the game:

"""
Welcome to FAIRY FUN!

This is not a fighting or competing game.

This game is supposed to be calm, peaceful, and fun.

There should be no cheating and just be yourself.
"""

Below this text, there is the "next" button, `images/next.png`.

When the player clicks on the "next" button, they enter the fairy
world at tile (7, 2).


### Fairy world

The fairy world is an explorable universe that the player flies/walks
their fairy around.

The fairy is represented by a female fairy emoji for the time being.

The player controls the fairy's movement with arrow keys when a
keyboard is available, or with an on-screen "joystick" for screen-only
interfaces - a circle within a circle that the user can push with
their finger in the direction they want to move.

The fairy world has 30 "tile" images that are referenced by their
position relative to the (1, 1) tile in the lower left. The world is
ten tiles wide (left to right) and three tiles "tall" (up and down).
The seventh tile to the right and the second tile up, tile (7, 2) is
the starting tile.

When the player moves beyond a boundary that leads to another tile,
the tile image changes to the new tile and the player appears in the
side closest to the tile they were last on. In this way the player can
explore the whole map.

The tile images have filenames like `images/world/7_2.png` which is
the starting tile.


## Future plans (not implemented yet)

 * Fairy creation between welcome screen and pick your pet.
 * "Pick your pet" screen between fairy creation and fairy world.
 * Upgrade fairy emoji to customizable fairy images.
 * Make fairy world 3D.
     * Edit some of the images so that we can make it 3D so that we
       can see some signs that may be blocked by other things.
 * Side doors that lead to fun activities including obstacle courses
   and much more.
 * Pick a car or other vehicle.
 * Add up/down buttons to switch between walking and flying. When you
   press up, up turns grey and down turns rainbow. When you press
   down, down turns grey and up turns rainbow.
 * "Exit" button from all screens except initial.
