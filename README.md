
Simple partial snippet path library for Handlebars
---

Simple Usage
-------------------

There might be so many partials on real project that is based on [Handlebars](http://handlebarsjs.com). Let's maintain all the templates on single file.

Make a path using block like `path1.path2` it is very easy.

Template sample
-------------------
    {{#root}}
        {{title}},
        {{#child1}}
            root.child1: {{value1}},
        {{/child1}}
        {{#child2}}
            root.child2: {{value1}},
        {{/child2}}

        {{#helperTest title}}{{/helperTest}}

        {{#child3}}
            root.child3-1: {{value1}},
        {{/child3}}
        {{#child3}}
            root.child3-2: {{value1}},
        {{/child3}}

        {{#child4}}
            {{#child3}}
                root.child4.child3-3: {{value1}},
            {{/child3}}

            {{#child3}}
                root.child4.child3-4: {{value1}}
            {{/child3}}
        {{/child4}}
    {{/root}}


General case
-------------------
    Handlebars.blockSnippet(text, "root", {
        "title": "title"
        , "child1": {
            "value1": "child1.value1"
        }
        , "child2": {
            "value1": "child2.value1"
        }
    });

Result is
    title
        root.child1: child1.value1
        root.child2: child2.value1
        %helperTest: title



Use blocksnippet
-------------------
    Handlebars.blockSnippet(text, "root.child1", {
        "value1": "child1.value1"
    });


Result is
    root.child1: child1.value1,


Or find all matched blocks.
-------------------
    Handlebars.blockSnippet(text, "child3", {
        "value1": "value1",
        "child4": {
            "child3": true
        }
    });

    Handlebars.blockSnippet(text, "root.child4.child3", {
        "value1": "value1"
    });

