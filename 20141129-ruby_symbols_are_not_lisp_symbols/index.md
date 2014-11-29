# Ruby Symbols are not Lisp Symbols

I heard about [How Emacs influenced Ruby](http://www.johndcook.com/blog/2012/03/28/how-emacs-influenced-ruby/) and the main thing I took from it was the possible connection between (Emacs) Lisp symbols and Ruby symbols, [as suggested by Xah](http://ergoemacs.org/emacs/Matz_Ruby_how_emacs_changed_my_life.html). But Ruby symbols and Lisp symbols are really quite different.

In Ruby you write a symbol starting with a colon. This looks similar to writing an apostrophe before a symbol in Lisp to quote it.

```ruby
# Ruby
:aaron         # This is a symbol.
               # It is written and displayed with a leading colon.
# => :aaron
```

```lisp
; Lisp
'aaron         ; This is shorthand for the next line.
(quote aaron)  ; These both evaluate to the symbol itself, as shown.
; => aaron
```

The big difference is that in Lisp, symbols evaluate as variables and functions. That's why you have to quote a symbol in Lisp to work with the symbol itself. In Ruby, on the other hand, symbols never evaluate to anything else. Variable and method names in Ruby are not symbols; they're off in their own world. Note the differing error messages here:

```ruby
# Ruby
aaron        # This is not a symbol but evaluates as a variable or method.
# => NameError: undefined local variable or method `aaron' for main:Object
```

```lisp
; Lisp
aaron        ; This is a symbol which will (try to) evaluate as a variable.
; => *** Eval error ***  Symbol's value as variable is void: aaron
```

You can't set (or bind) a Ruby symbol to a value at all—it's a syntax error. But that's exactly what you do in Lisp.

```ruby
# Ruby
:aaron = 12       # This attempts to set a symbol to 12, which Ruby hates.
# => SyntaxError: (irb):10: syntax error, unexpected '=', expecting end-of-input
```

```lisp
; Lisp
(set 'aaron 12)   ; This sets a symbol's value as a variable to 12.
; => 12
```

Conversely, what works naturally in Ruby is nonsense in Lisp.

```ruby
# Ruby
aaron = 27        # This sets a variable to 27.
# => 12
```

```lisp
; Lisp
(set aaron 27)    ; This attempts to set 12 to 27.
; => *** Eval error ***  Wrong type argument: symbolp, 12
```

Deeper differences between Lisp and Ruby are evident, for example, in the behavior of `eval`. In Ruby, `eval` takes a string, while in Lisp, it takes a Lisp object. So while it's true that in Ruby `eval(:aaron.to_s)` will give the variable `aaron`'s value, it's fairly unrelated to the symbol `:aaron`, and quite different from `(eval aaron)` in Lisp.

Some uses of Ruby and Lisp symbols are similar, but by and large trying to think of them as related was doing me more harm than good.

I found that [Christian Neukirchen](https://twitter.com/chneukirchen) has [a 2005 post with the same name as this one](http://chneukirchen.org/blog/archive/2005/12/ruby-symbols-are-not-lisp-symbols.html), which points out even more differences between Lisp symbols and Ruby symbols. His link to the Common Lisp HyperSpec "K" glossary page (for "keyword") is broken; here's [a working one](http://www.lispworks.com/documentation/HyperSpec/Body/26_glo_k.htm). I'm playing with [Emacs Lisp](http://en.wikipedia.org/wiki/Emacs_Lisp) here, not [Common Lisp](http://en.wikipedia.org/wiki/Common_Lisp). There may be more to be said.
