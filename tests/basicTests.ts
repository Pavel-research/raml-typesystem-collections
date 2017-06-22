"use strict";
import chai = require("chai");
import  mocha=require("mocha")
import rp=require("raml-1-parser");
import json=require("json2raml-loader");
let assert = chai.assert;
import path=require("path")
import fs=require("fs")
import ri=require("raml1-domain-model")
import main=require("callables-rpc-views");
import colections=require("../src/main");


function loadApi(name: string){
    var rs = <rp.api10.Api>rp.loadRAMLSync(path.resolve(__dirname, "../../tests/raml/" + name + ".raml"), []);
    var s = rs.expand(true).toJSON({serializeMetadata: false});
    var result = json.loadApi(s);
    return main.module(result);
}

export function setNextResponse(m:main.BasicHTTPModule,value:any){
    m.executor={
        execute(r){
            return Promise.resolve(value);
        }
    }
}


describe("structure tests", function () {
    it("test0", function (done) {
        var l = loadApi("test1");
        setNextResponse(l,{
            items:[1,2,3,4],
            total: 5
        })
        assert(colections.isCollection(l.functions()[0]));
        let col=colections.toCollection(l.functions()[0])
        var range=col.range();
        assert(range.name()=="Item");
        col.total().then(x=>{
            assert(x==5);
            done();
        })
        col.page().then(y=>{
            assert(y.length==4);
        })
    })
    it("test1", function (done) {
        var l = loadApi("test2");
        setNextResponse(l,{
            items:[1,2,3,4],
            total: 5
        })
        assert(colections.isCollection(l.functions()[0]));
        let col=colections.toCollection(l.functions()[0])
        var range=col.range();
        assert(range.name()=="Item");
        col.total().then(x=>{
            assert(x==5);
            done();
        })
        col.page().then(y=>{
            assert(y.length==4);
        })
    })
    it("test3", function (done) {
        var l = loadApi("test3");

        assert(colections.isCollection(l.functions()[0]));
        let col=colections.toCollection(l.functions()[0])
        var parameters = col.parameters();
        assert(parameters.length == 1);
        assert(!parameters[0].required());
        done();
    })
    it("test4", function (done) {
        var l = loadApi("test3");
        assert(colections.isCollection(l.functions()[0]));
        let col=colections.toCollection(l.functions()[0])
        col.forEach(x=>{

        })
    })
})
