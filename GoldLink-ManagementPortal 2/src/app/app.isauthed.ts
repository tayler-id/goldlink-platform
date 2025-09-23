import { Injectable } from '@angular/core';
import { Router, CanActivate, CanLoad } from '@angular/router';
import { GlobalVariables } from './app.globals';

@Injectable({
  providedIn: 'root'
})
export class OnlyAuthedService implements CanActivate {

  constructor(private g: GlobalVariables, private r: Router) { }

  canActivate(): boolean 
  {
    let sessionstoragechecksum = sessionStorage.getItem('BMUserChecksum') || localStorage.getItem('BMUserChecksum');
    if(sessionstoragechecksum && !this.g.AuthChecksum) this.g.AuthChecksum = parseInt(sessionstoragechecksum);
    this.g.VerifyAuth();
    if(!this.g.AuthChecksum) // this is done in VerifyAuth instead
    {
      //console.log("Not authed!");
      //this.r.navigate(['admin']);
      return false;
    }
    return true;
  }
}

@Injectable({
  providedIn: 'root'
})
export class RoleGuardService implements CanActivate {

  constructor(private g: GlobalVariables, private r: Router) { }

  canActivate(): boolean 
  {
    let sessionstoragechecksum = sessionStorage.getItem('BMUserAccess') || localStorage.getItem('BMUserAccess');
    if(sessionstoragechecksum && !this.g.AccessLevel) this.g.AccessLevel = parseInt(sessionstoragechecksum);
    if(!this.g.AccessLevel) this.g.GetUserData();
    if(this.g.AccessLevel<5)  // admin
    {
      return false;
    }
    return true;
  }
}