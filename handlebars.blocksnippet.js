/**
 * Copyright (c) 2012 https://github.com/freestrings
 *
 * MIT Licensed
 */
(function() {

    var __hbdebug__ = !!window._debug_;
    
    var Token = function(token, op) {
        this.token = token;
        this.op = op;
        this.type = Token.REGEXP.test(token) ? Token.ARRAY : Token.NORMAL;
    }
    
    Token.REGEXP = /[a-zA-Z0-9_$-]+\[([0-9]+)\]$/;
    Token.NORMAL = 0;
    Token.ARRAY = 1;
    
    Token.OP_SINGLE = 0;
    Token.OP_ALL = 1;
    
    Token.prototype = {
        getType : function() {
            return this.type
        },
        getValue : function() {
            return this.token.replace(/\[([0-9]+)\]$/, "");
        },
        getOp : function() {
            return this.op;
        },
        getIndex : function() {
            return parseInt(this.token.match(Token.REGEXP)[1], 10);
        },
        toString : function() {
            return (this.op == Token.OP_SINGLE ? "." : "..") + this.token;
        }
    }
    
    var TokenIterator = function(path){
        this.path = path;
        this.token;
        this.pathes = (function() {
            
            var pathes = [], temp = [], t;
            for(var i = 0 ; i < path.length ; i++) {
                t = path[i];
                if(t === ".") {
                    if(temp.length > 0) {
                        pathes.push(temp.join(""));
                        temp = [];
                    }
                    pathes.push(t)
                } else {
                    temp.push(t);
                }
            }
            if(temp.length > 0) {
                pathes.push(temp.join(""));
            }
            
            return {
                shift : function() {
                    return pathes.shift();
                },
                hasNext : function() {
                    return pathes.length > 0;
                }
            }
        })();
    }
    
    TokenIterator.prototype = {
        hasNext : function() {
            return this.pathes.hasNext() > 0;
        },
        next : function() {
            var p, op = undefined;
            while(this.hasNext()) {
                p = this.pathes.shift();
                if(p === "." && op === undefined) {
                    op = Token.OP_SINGLE;
                } else if(p === "." && op == Token.OP_SINGLE) {
                    op = Token.OP_ALL;
                } else if(p === ".") {
                    throw new SyntaxError(this.path);
                } else {
                    this.token = new Token(p, op === undefined ? Token.OP_ALL : op);
                    op = undefined;
                    break;
                }
            }
            if(op !== undefined) {
                throw new SyntaxError(this.path);
            }
            return this.token;
        },
        getToken : function() {
            return this.token;
        }
    }

    var Visitor = function(path) {
        this.iterator = new TokenIterator(path);
        this.iterator.next();
    }
    Visitor.prototype = {
        visit : function(astArray) {
            var target = [] , token = this.iterator.getToken();
            for(var i = 0 ; i < astArray.length ; i++) {
                this.matches(astArray[i], target, token);
            }
            if(target.length == 0) {
                return null;
            } else if(!this.iterator.hasNext()) {
                return new Handlebars.AST.ProgramNode(target);
            } else {
                this.iterator.next();
                return this.visit(target);
            }
        },
        getStatements : function(node) {
            return node.statements ? node.statements : node.program ? node.program.statements : undefined
        },
        matches : function(node, target, token) {
            var statements = this.getStatements(node),
                statement,
                arrayIndex = 0
            ;
            
            for(var i = 0 ; statements && i < statements.length ; i++) {
                statement = statements[i];
                if(statement instanceof Handlebars.AST.BlockNode && statement.mustache.id.original == token.getValue()) {
                    if(token.getType() == Token.ARRAY) {
                        if(token.getIndex() === arrayIndex) {
                            target.push(statement);
                        }
                        arrayIndex++;
                    } else {
                        target.push(statement);
                    }
                }
            }
            
            //
            // full scan ...((((;'')
            //
            if(token.getOp() == Token.OP_ALL) {
                for(var i = 0 ; statements && i < statements.length ; i++) {
                    statement = statements[i];
                    if(statement instanceof Handlebars.AST.BlockNode) {
                        this.matches(statement, target, token);
                    }
                }
            }
        }
    }
     
    var Cache = function() {
        this.cache = {}
    }
    Cache.prototype = {
        set : function(key, value) {
            var k = Cache.key(key);
            this.cache[k] = value;
            return k
        }
        , get : function(key) {
            return this.cache[Cache.key(key)];
        }
    }
    Cache.key = function(key) {
        return key;
    }
    
    var $cache = new Cache;
    
    function snippet_parse() {
        if(this.template.charAt(0) == '#') {
            var templateStr = document.getElementById(this.template.substr(1)).innerHTML;
            if(!templateStr) {
                throw new Error(template + " is null");
            } 
            this.ast = Handlebars.parse(templateStr);
        } else {
            this.ast = Handlebars.parse(this.template);
        }
        $cache.set(this.template, this.ast)
    }
    
    function snippet_template(result, bindData, cacheInfo) {
        var environment = new Handlebars.Compiler().compile(result, this.options)
        , templateSpec = new Handlebars.JavaScriptCompiler().compile(environment, this.options, undefined, true);
        ;
        cacheInfo["templateSpec"] = templateSpec;
        return Handlebars.template(templateSpec)(bindData);
    }
    
    function snippet_filterData(data) {
        if(typeof Backbone === "object" && data instanceof Backbone.Model) {
            return data.toJSON();
        } else {
            return data;
        }
    }
    
    function snippet_key(path, templateKey) {
        return Cache.key(templateKey || this.template) + ":" + path;
    }
    
    function Snippet(template, options) {
        this.template = template;
        this.options = options || {};
        this.ast;
        
        this.initialize();
    }
    Snippet.prototype = {
        initialize : function() {
            if(typeof this.template === "string") {
                var cachedAst = $cache.get(this.template);
                if(!cachedAst) {
                    __hbdebug__ && console.log("parse", this.template)
                    snippet_parse.apply(this);
                } else {
                    this.ast = cachedAst;
                }
            } else if(typeof template === 'object'){
                this.ast = template;
            } else {
                throw new Error("UnSupported parameter type. " + template);
            }
        }
        , snippet : function(path, data, templateKey) {
            var snippetKey = snippet_key.call(this, path, templateKey)
            , cachedSnippetInfo = $cache.get(snippetKey)
            ;
            
            if(!cachedSnippetInfo) {
                __hbdebug__ && console.log("create new template", path)
                var visitor = new Visitor(path)
                , result = visitor.visit([this.ast])
                , lastTokenValue = visitor.iterator.getToken().getValue()
                , bindData = {}
                , template = ""
                , cacheInfo = {
                    "result" : result
                    ,"lastTokenValue" : lastTokenValue 
                }
                
                if(Handlebars.helpers[lastTokenValue]) {
                    bindData = snippet_filterData(data);
                } else {
                    bindData[lastTokenValue] = snippet_filterData(data)
                }
                
                if(!lastTokenValue) {
                    throw new Error("IllegalStateError. the LastToken is null.");
                }
                
                if(result !== null) {
                    template = snippet_template.call(this, result, bindData, cacheInfo);
                }
                
                $cache.set(snippetKey, cacheInfo);
                
                return template;
            } else {
                if(cachedSnippetInfo.templateSpec) {
                    var result = cachedSnippetInfo.result
                    , lastTokenValue = cachedSnippetInfo.lastTokenValue
                    , templateSpec = cachedSnippetInfo.templateSpec
                    , bindData = {}
                    ;
                    
                    if(Handlebars.helpers[lastTokenValue]) {
                        bindData = snippet_filterData(data);
                    } else {
                        bindData[lastTokenValue] = snippet_filterData(data)
                    }
                    
                    return Handlebars.template(templateSpec)(bindData);
                } else {
                    return "";
                }
            }
        }
        , all : function(data, templateKey) {
            var snippetKey = snippet_key.call(this, "__all__", templateKey)
            , cachedSnippetInfo = $cache.get(snippetKey)
            , template = ""
            ;
            if(!cachedSnippetInfo) {
                var cacheInfo = {}
                template = snippet_template.call(this, this.ast, data, cacheInfo);
                $cache.set(snippetKey, cacheInfo);
                return template;
            } else {
                return Handlebars.template(cachedSnippetInfo.templateSpec)(data);
            }
        }
    }
        
    Handlebars.blockSnippet = function(template, path, data, options, templateKey) {
        if(path) {
            return new Snippet(template, options).snippet(path, data||{}, templateKey)
        } else {
            return new Snippet(template, options).all(data||{}, templateKey)
        }
    }
    
})();

