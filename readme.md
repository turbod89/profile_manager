# Profile manager.

### About

This repo is a profile manager for backends and frontends. It works in express server that connects to a MongoDB.

Backends should be register in collection `apis` as a document with two fileds: `name` and `token`. Last one must contain the value of token required by api authentication.

Every backend can manage `profiles` and its profile `images`. Both should be collections on MongoDB. Every request from a backend should have a header
```
    api-token: <token>
```
For further details checkout the documentation.

Secondly, each `Profile` has it's own `token` and can make authenticated requests by using header
```
    Authorization: Bearer <token>
```
Notice that, although backend can know tokens of any profile, frontend should only know the token of the profile it's managing, since user's `token` is used to do authenticated actions.

Again, for further details checkout the documentation.

### Documentation

Nowadays it is not stored at any place. You can generate it by using [apidoc](http://apidocjs.com/):
```bash
apidoc  -e node_modules/ -i ./ -o ../docs/
```
