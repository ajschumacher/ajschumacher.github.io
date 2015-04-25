def a_counter(count={'val': 0}):
    def counter():
        count['val'] += 1
        return count['val']
    return counter

the_counter = a_counter()
print(the_counter())
print(the_counter())
print(the_counter())
