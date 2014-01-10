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