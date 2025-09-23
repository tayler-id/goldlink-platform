import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GlobalVariables } from '../../app.globals';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'logout.component.html'
})
export class LogoutComponent implements OnInit {

  constructor(private r: Router, private http: HttpClient, private g: GlobalVariables) { }

  ngOnInit()
  {
    this.g.AuthChecksum = 0;
    this.g.IsAuthed = false;
    sessionStorage.setItem('BMUserChecksum', '');
    localStorage.setItem('BMUserChecksum', '');
    sessionStorage.setItem('BMUserAccess', '');
    localStorage.setItem('BMUserAccess', '');
    document.cookie = 'BMUserChecksum=; Max-Age=0; path=/; domain=goldlink.live;';
    window.location.href = 'https://goldlink.live';
    this.r.navigate(["login"]);
  }

 }
